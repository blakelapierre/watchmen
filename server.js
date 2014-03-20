var githubhook = require('githubhook'),
    _ = require('underscore'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    childProcess = require('child_process');

var watching = {};

function puts(error, stdout, stderr) { sys.puts(stdout); };

function exec(command) { 
    console.log('executing command: ' + command);
    return childProcess.exec(command, puts);
};

exports.startServer = function (config, callback) {
    var github = githubhook(config.server);

    var retrieve = function(repo, data) {
        var project = watching[repo] || {
            name: repo,
            location: '/apps/' + repo,
            remoteLocation: data.repository.url,
            initialized: false,
            nextDeploymentID: 0
        };

        watching[repo] = project;

        if (!project.initialized) initialize(project);
        
        return project;
    };

    var initialize = function(project) {
        var location = path.join(project.location, project.nextDeploymentID.toString());
            commands = [
                'mkdir -p ' + location,
                'cd ' + location,
                'git init',
                'git remote add origin ' + project.remoteLocation,
                'git pull origin master',
                'npm install',
                'bower install',
                'grunt localDeploy'
            ];

            project.deploymentCommand = commands.join(' && ');
    };
    
    var deploy = function(project) {
        if (project.deployment) {
            project.redeploy = true;
            project.deployment.kill();
        }
        else {
            var deploymentID = project.nextDeploymentID++;

            project.redeploy = false;
            project.deployment = exec(project.deploymentCommand);
            project.deployment.on('exit', function() {
                delete project.deployment;
                if (project.redeploy) deploy(project);
            });
        }
    };

    github.on('push', function(repo, ref, data) {
console.dir(data);
        var project = retrieve(repo, data);
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
