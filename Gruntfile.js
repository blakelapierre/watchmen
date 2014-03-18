module.exports = function(grunt) {
    var pkg = grunt.file.readJSON('package.json');

    grunt.initConfig({
        pkg: pkg,
        bgShell: {
            startServer: {
                cmd: 'node server.js',
                bg: false
            }
        }
    });

    grunt.loadNpmTasks('grunt-bg-shell');

    grunt.registerTask('default' , '', function() {
        grunt.task.run('bgShell:startServer');
    });
};