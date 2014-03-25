var githubhook = require('githubhook'),
    _ = require('underscore'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    childProcess = require('child_process'),
    psTree = require('ps-tree');

var watching = {};

function puts(error, stdout, stderr) { sys.puts(stdout); };

function exec(command) { 
    console.log('executing command: ' + command);
    var deployment = childProcess.spawn('/bin/sh', ['-c', command]);

    deployment.on('error', function(error) {
        console.dir(error);
    });

    deployment.stdout.on('data', function(data) {
        console.log('stdout: ' + data);
    });

    deployment.stderr.on('data', function(data) {
        console.log('stderr: ' + data);
    });

    return deployment;
};

exports.startServer = function (config, callback) {
    var github = githubhook(config.server);

    var retrieve = function(repo, data) {
        console.dir(data);
        var project = watching[repo] || {
            name: repo,
            location: '/apps/' + repo,
            branch: data.repository.master_branch,
            remoteLocation: data.repository.url,
            initialized: false,
            nextDeploymentID: 0
        };

        watching[repo] = project;

        if (!project.initialized) initialize(project);
        
        return project;
    };

    var initialize = function(project) {
        console.log('Initializing project ' + project.name);
        var location = path.join(project.location, project.nextDeploymentID.toString());
            commands = [
                'rm -rf ' + location,
                'mkdir -p ' + location,
                'cp watchmen_deployment_script ' + path.join(location, '.watchmen_deploying'),
                'cd ' + location,
                'git init',
                'git remote add origin ' + project.remoteLocation,
                'git pull origin ' + project.branch,
                './deploy'
               // 'chmod +x .watchmen_deploying',
               // './.watchmen_deploying'
            ];

        project.deploymentCommand = commands.join(' && ');
        project.initialized = true;
    };
    
    var deploy = function(project) {
        if (project.deployment) {
            project.redeploy = true;
console.log('killing old deployment of ' + project.name);    
            
            psTree(project.deployment.pid, function(err, children) {
                childProcess.spawn('kill', ['-9'].concat(children.map(function (p) {return p.PID})));
            });
        }
        else {
//            var deploymentID = project.nextDeploymentID++;
            var location = path.join(project.location, project.nextDeploymentID.toString());

            project.redeploy = false;

console.log('deploying ' + project.name + ' now');
            project.deployment = exec(project.deploymentCommand);
            project.deployment.on('exit', function() {
console.log(project.name + ' deployment ended');
                delete project.deployment;
                if (project.redeploy) deploy(project);
            });


            var commands = [
                'cd ' + location,
                'git pull origin ' + project.branch,
                './deploy'
//                './.watchmen_deploying'
            ];
            
            project.deploymentCommand = commands.join(' && ');
        }
    };

    github.on('push', function(repo, ref, data) {
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
