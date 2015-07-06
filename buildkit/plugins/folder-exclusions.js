var Plugin = require("../lib/Plugin.js");

module.exports = new Plugin({

	initialize: function() {
		this.deps(GLOBAL, {
			'_': "underscore",
			"logger": "../lib/logger.js"
		});
	},

	_displayedCourseExclusions: {},
	_displayedGlobalExclusions: false,

	"config:loaded": function(config) {
		//console.log("config:loaded", config);
	},

	"actions:setup": function(actions) {
		//console.log("actions:setup", actions);
	},

	"actions:build": function(actions) {
		
		for (var a = 0, al = actions.length; a < al; a++) {
			var options = actions[a];
			if (options['@buildOnce'] || !options.buildConfig) continue;	

			applyGeneralExclusions.call(this, options);
			applyCourseSpecificExclusions.call(this, options);

		}

		function applyGeneralExclusions(options) {
			//do general exclusions
			var globalExcludes = options.buildConfig.excludes;
			if (globalExcludes && globalExcludes instanceof Array && globalExcludes.length > 0) {

				var globs = [];
				for (var i = 0, l = globalExcludes.length; i < l; i++) {
					globs.push("!**/" + globalExcludes[i]);
					globs.push("!**/" + globalExcludes[i] + "/**/*");
				}

				if (options.exclusionGlobs) {
					globs = options.exclusionGlobs.concat(globs);
				}

				options.exclusionGlobs = globs;

				options.exclusionGlobs = _.uniq(options.exclusionGlobs);

				if (!this._displayedGlobalExclusions) {
					logger.log(">Excluding:\n    " + globalExcludes.join(",\n    "), 1);
					this._displayedGlobalExclusions = true;
				}
			}
		}
		
		function applyCourseSpecificExclusions(options) {
			//do course specific exclusions
			if (options.course == '' || !options.buildConfig[options.course]) return;

			var excludes = options.buildConfig[options.course].excludes;
			if (excludes && excludes instanceof Array && excludes.length > 0) {

				if (globalExcludes && globalExcludes instanceof Array && globalExcludes.length > 0) {
					//only apply course specific exclusions when not global also
					excludes = _.difference(excludes, globalExcludes);
				}

				if (excludes.length > 0 ) {
					var globs = [];
					for (var i = 0, l = excludes.length; i < l; i++) {
						globs.push("!**/" + excludes[i]);
						globs.push("!**/" + excludes[i] + "/**/*");
					}

					if (options.exclusionGlobs) {
						globs = options.exclusionGlobs.concat(globs);
					}

					options.exclusionGlobs = globs;

					options.exclusionGlobs = _.uniq(options.exclusionGlobs);

					if (!this._displayedCourseExclusions[options.course]) {
						logger.log(">"+options.course + " - Excluding:\n    " + excludes.join(",\n    "), 1);
						this._displayedCourseExclusions[options.course] = true;
					}
				}
			}
		}
	},

	"actions:phase": function(phaseName) {
		//console.log("actions:phase", phaseName);
	},

	"action:prep": function(options, action) {		
		//console.log("action:prep", options, action);
	},

	"action:start": function(options, action) {
		//console.log("action:start", options, action);
	},

	"action:error": function(options, error, action) {
		//console.log("action:error", options, error);
	},

	"action:end": function(options, action) {
		//console.log("action:end", options);
	},

	"actions:wait": function() {
		//console.log("actions:wait");
	}

})
