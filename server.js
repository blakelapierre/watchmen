var githubhook = require('githubhook'),
    _ = require('underscore'),
    sys = require('sys'),
    fs = require('fs'),
    childProcess = require('child_process');

var watching = {};

function puts(error, stdout, stderr) { sys.puts(stdout); };

function exec(location, command) { 
    console.log('executing ' + command + ' at: ' + location);
    return childProcess.exec('cd ' + location + ' && ' + command, puts);
};

exports.startServer = function (config, callback) {
    var github = githubhook(config.server);

    var retrieve = function(repo) {
        var project = watching[repo] || {
            name: repo,
            location: '/apps/' + repo,
            initialized: false
        };

        watching[repo] = project;

        if (!project.initialized) initialize(project);
    };

    var initialize = function(project) {
        if (!fs.existsSync(project.location)) {
            fs.mkdirSync(project.location, 0775);
        }
    };
    
    var deploy = function(project) {
        if (project.deployment) {
            project.redeploy = true;
            project.deployment.kill();
        }
        else {
            project.redeploy = false;
            project.deploy = exec(project.location, 'git pull origin');
            project.deploy.on('exit', function() {
                delete project.deploy;
                if (project.redeploy) deploy(project);
            });
        }
    };

    github.on('push', function(repo, ref, data) {
    	var project = retrieve(repo);

        deploy(project);
    });

    github.listen();

    callback(github);
};

var config = {
    server: {
        port: 2999,
        logger: console
    }
};

exports.startServer(config, function(github) {});
