var githubhook = require('githubhook'),
    _ = require('underscore'),
    sys = require('sys'),
    childProcess = require('child_process');
  
var watching = {
	"facerace": {
		location: '/home/facerace/facerace',
		commands: [
			'grunt localDeploy'
		]
	},
	"watchmen_test": {
		location: '/home/watchmen/watchmen_test',
		commands: [
			'echo "hello world"'
		]
	}
};

function puts(error, stdout, stderr) { sys.puts(stdout); };

function exec(location, command) { 
    console.log('executing ' + command + ' at: ' + location);
    childProcess.exec('cd ' + location + ' && ' + command, puts);
};

exports.startServer = function (config, callback) {
    var github = githubhook(config.server);

    github.listen();
    
    github.on('push', function(repo, ref, data) {
    	var project = watching[repo];

	    if (project) {
    		_.each(project.commands, function(command) {
                exec(project.location, command);
		    });
	    }
    });

    callback(github);
};

var config = {
    server: {
        port: 2999,
        logger: console
    }
};

exports.startServer(config, function(github) {});
