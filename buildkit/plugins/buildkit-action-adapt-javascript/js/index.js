'use strict';

class Plugin {

	constructor() {
		this.init();
		this.setupEventListeners();
	}

	init() {
		this.onActionsReset();
	}

	setupEventListeners() {
		events.on("actions:reset", () => { this.onActionsReset(); });
		events.on("action:run:javascript", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionsReset() {
		this._outputCache = {};
        this._waitingForBuildOnce = {};
	}

    onActionRun(options, start, end) {
        start();

        options.dest = Location.contextReplace(options.dest, options);

        //see if it's possible to inject the preset locations
         babelCore.OptionManager.prototype.mergePresets = function mergePresets(presets /*: Array<string | Object>*/, dirname /*: string*/) {
            for (var _iterator2 = presets, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _getIterator(_iterator2);;) {
              var _ref2;

              if (_isArray2) {
                if (_i2 >= _iterator2.length) break;
                _ref2 = _iterator2[_i2++];
              } else {
                _i2 = _iterator2.next();
                if (_i2.done) break;
                _ref2 = _i2.value;
              }

              var val = _ref2;

              if (typeof val === "string") {
                
                var presetLoc = path.join(__dirname, "../../../node_modules/", "babel-preset-" + val); //_helpersResolve2["default"]("babel-preset-" + val, dirname) || _helpersResolve2["default"](val, dirname);
                console.log(presetLoc);
                if (presetLoc) {
                  var presetOpts = require(presetLoc);
                  this.mergeOptions(presetOpts, presetLoc, presetLoc, _path2["default"].dirname(presetLoc));
                } else {
                  throw new Error("Couldn't find preset " + JSON.stringify(val) + " relative to directory " + JSON.stringify(dirname));
                }
              } else if (typeof val === "object") {
                this.mergeOptions(val);
              } else {
                throw new Error("todo");
              }
            }
          };

        babelCore.transformFile("src/core/js/app.js", {
            "env": {

            },
            "presets": [
                "es2015"
            ],
            "sourceRoot": "src/"
        }, function (err, result) {
            console.log(err);
            //fs.writeFileSync(options.dest, result.code);
            end();
        });

       
        
    }

	onActionRunOld(options, start, end) {
		options = options || {};

        options.dest = Location.contextReplace(options.dest, options);

        if (options.dest) options.requirejs.out = options.dest;

        if (fs.existsSync(options.dest) && options.switches.force !== true && options.changes) {

            var tree = treecontext.Tree(options.changes.src, ".");
            options.changes.globs = Location.contextReplace(options.changes.globs, options);
            var globs = new GlobCollection(options.changes.globs);
            var files = tree.mapGlobs(globs).files;

            var destStat = fs.statSync(options.dest);
            var changed = false;
            for (var i = 0, l = files.length; i < l; i++) {
                if (files[i].mtime > destStat.mtime || files[i].ctime > destStat.mtime) {
                    changed = true;
                    break;
                }
            }

            var mapExists = false;
            if (fs.existsSync(options.dest + ".map")  ) {
                mapExists = true;
            } 
            changed = (mapExists == (!options.switches.debug)) || changed;

            
            if (!changed) {
                return end();
            }
        }

        if (fs.existsSync(options.dest+".map")) fs.unlinkSync(options.dest+".map");

        if (options['@buildOnce'] === true) {
            if (this._outputCache[options["@name"]]) {
                
                FileSystem.mkdir(path.dirname(options.dest));
                fs.writeFileSync(Location.toAbsolute(options.dest), this._outputCache[options["@name"]].javascript);
                if (this._outputCache[options['@name']].sourcemap) {
                    fs.writeFileSync(Location.toAbsolute(options.dest)+".map", this._outputCache[options["@name"]].sourcemap);
                }
                return end();
            } else {
                if (this._waitingForBuildOnce[options["@name"]]) {
                    this._waitingForBuildOnce[options["@name"]].push(options);
                    return end();
                } else {
                    this._waitingForBuildOnce[options["@name"]] = [];
                }
            }
        }

        start();

        if (!options.requirejs.paths) options.requirejs.paths = {};

        if (options.includes) {
            var cwd = path.join(process.cwd(), options.requirejs.baseUrl);
            var rootName = options.requirejs.name;
            options.requirejs.shim = options.requirejs.shim || {};
            options.requirejs.shim[rootName] = options.requirejs.shim[rootName] || {};
            options.requirejs.shim[rootName]['deps'] = options.requirejs.shim[rootName]['deps'] || [];

            for (var prefix in options.includes) {
                for (var atPath in options.includes[prefix]) {

                    var fromPath = path.join(options.requirejs.baseUrl, atPath);
                    var tree = treecontext.Tree(fromPath, ".");
                    options.includes[prefix][atPath] = Location.contextReplace(options.includes[prefix][atPath], options);
                    var globs = new GlobCollection(options.includes[prefix][atPath]);
                    var files = tree.mapGlobs(globs).files;

                    for (var f = 0, fl = files.length; f < fl; f++) {
                        var relativePath = files[f].location.substr( cwd.length );
                        if (relativePath.substr(0,1)) relativePath = relativePath.substr(1);

                        var ext = path.extname(relativePath);
                    
                        relativePath = relativePath.slice(0, -ext.length);
                        
                        var moduleName = (prefix != "*" ? prefix+"/" : "") + files[f].filename;
                        options.requirejs.paths[moduleName] = options.requirejs.paths[moduleName] || relativePath;

                        options.requirejs.shim[rootName]['deps'].push(moduleName);
                    }
                }
            }
            
        }

        if (options.includeBundles) {
            var rootName = options.requirejs.name;
            options.requirejs.shim = options.requirejs.shim || {};
            options.requirejs.shim[rootName] = options.requirejs.shim[rootName] || {};
            options.requirejs.shim[rootName]['deps'] = options.requirejs.shim[rootName]['deps'] || [];
            
            for (var i = 0, l = options.includeBundles.length; i < l; i++) {
                var bundleName = options.includeBundles[i];
                var config = messages.get({
                    plugin: "javascriptbundle",
                    course: options.course,
                    bundleName: bundleName
                });
                for (var p = 0, pl = config.message.length; p < pl; p++) {
                    var plugin = config.message[p];
                    options.requirejs.paths[plugin] = plugin;
                    options.requirejs.shim[rootName]['deps'].push(plugin);
                }
            }
        }

        if (options.empties) {
            for (var prefix in options.empties) {
                for (var atPath in options.empties[prefix]) {
                    var fromPath = path.join(options.requirejs.baseUrl, atPath);
                    var tree = treecontext.Tree(fromPath, ".");
                    options.empties[prefix][atPath] = Location.contextReplace(options.empties[prefix][atPath], options);
                    var globs = new GlobCollection(options.empties[prefix][atPath] );
                    var files = tree.mapGlobs(globs).files;

                    for (var f = 0, fl = files.length; f < fl; f++) {
                        var pfx = (prefix != "*" ? prefix+"/" : "");
                        var fn = files[f].filename;
                        options.requirejs.paths[pfx+fn] = options.requirejs.paths[(prefix != "*" ? prefix+"/" : "")+files[f].filename] || "empty:";
                    }
                }
            }
        }

        switch (options.switches.debug) {
        case true:
            options.requirejs.generateSourceMaps = !options.switches.quick;
            options.requirejs.optimize = "none";
            break;
        default:
            options.requirejs.generateSourceMaps = false;
            options.requirejs.optimize = !options.switches.quick ? "uglify2" : "none";
            break;
        } 

        requirejs.optimize(options.requirejs, _.bind(function (buildResponse) {
            try {

                if (options.sourceMapRelocate && options.requirejs.generateSourceMaps) {
                    this.sourceMapRelocate(options.dest + ".map", options.sourceMapRelocate);
                }
                if (options['@buildOnce']) {
                    if (options.requirejs.generateSourceMaps) {
                        this._outputCache[ options['@name'] ] = {
                            javascript: fs.readFileSync(options.dest),
                            sourcemap: fs.readFileSync(options.dest + ".map")
                        };
                    } else {
                        this._outputCache[ options['@name'] ] = {
                            javascript: fs.readFileSync(options.dest)
                        };
                    }

                    if ( this._waitingForBuildOnce[options["@name"]] ) {
                        var queue =  this._waitingForBuildOnce[options["@name"]];
                        for (var i = 0, l = queue.length; i < l; i++) {
                            var item = queue[i];

                            FileSystem.mkdir(path.dirname(item.dest));
                            if (options.requirejs.generateSourceMaps) {
                                 fs.writeFileSync(Location.toAbsolute(item.dest) + ".map", this._outputCache[options["@name"]].sourcemap );
                            }
                            fs.writeFileSync(Location.toAbsolute(item.dest), this._outputCache[options["@name"]].javascript );
                        }
                    }
                    
                }

            } catch(e) {

                console.log("requirejs.optimize: ", e);
            }

            end();

        }, this), function(error) {
            end(error);
        });
	}

	sourceMapRelocate(file, pathRelocation) {
        file = Location.toAbsolute(file);
		var json = JSON.parse(fs.readFileSync(file));
		for (var i = 0, l = json.sources.length; i < l; i++) {
			json.sources[i] = path.join(pathRelocation, json.sources[i]);
			json.sources[i] = json.sources[i].replace(/\\/g, "/");
		}
		fs.writeFileSync(file, JSON.stringify(json));
	}
	
}

module.exports = Plugin;
