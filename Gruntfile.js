module.exports = function(grunt) {
	
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		mochaTest: {
	      test: {
	        options: {
	          reporter: 'spec',
	          timeout: 1000000
	        },
	        src: ['test/**/*.js']
	      }
	    },
		jshint: {
			ignore_warning: {
				options: {
				},
			},
			all: ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js'],	
		},
	});
	
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	//build
	grunt.registerTask('default', ['jshint:all','mochaTest']);
	//lint
	grunt.registerTask('lint', ['jshint:all']);
	//test
	grunt.registerTask('test', ['mochaTest']);
};
