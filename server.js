var githubhook = require('githubhook'),
    _ = require('lodash'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    childProcess = require('child_process'),
    psTree = require('ps-tree');

var watching = {},
    deployments = {};

function puts(error, stdout, stderr) { sys.puts(stdout); };

function exec(command) { 
    console.log('executing command: ' + command);
    var deployment = childProcess.spawn('/bin/sh', ['-c', command]);

    deployment.on('error', function(error) { console.dir(error); });

    deployment.stdout.on('data', function(data) { process.stdout.write(data); });
    deployment.stderr.on('data', function(data) { process.stderr.write(data); });

    return deployment;
};

var dbFileName = 'watching.json';
var writeDB = function(db) {
    fs.writeFile(dbFileName, JSON.stringify(db, null, 1), function(err) {
        if (err) console.log(err);
        else console.log('Saved ' + dbFileName);
    })
};

var readDB = function() {
    if (fs.existsSync(dbFileName)) {
        try {
            return JSON.parse(fs.readFileSync(dbFileName));
        }
        catch (e) {
            console.log(e);
        }
    }
    return {};
};

exports.startServer = function (config, callback) {
    var github = githubhook(config.server);

    var retrieve = function(repo, data) {
        return watching[repo] || initialize({
            name: repo,
            location: '/apps/' + repo,
            branch: data.repository.master_branch,
            remoteLocation: data.repository.url,
            initialized: false,
            nextDeploymentID: 0
        });
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

        watching[project.name] = project;

        writeDB(watching);

        return project;
    };
    
    var deploy = function(project) {
        var deployment = deployments[project.name];

        if (deployment) {
            project.redeploy = true;
            console.log('killing old deployment of ' + project.name);    
            
            psTree(deployment.pid, function(err, children) {
                childProcess.spawn('kill', ['-9'].concat(children.map(function (p) {return p.PID})));
            });
        }
        else {
            // var deploymentID = project.nextDeploymentID++;
            var location = path.join(project.location, project.nextDeploymentID.toString());

            project.redeploy = false;

            console.log('deploying ' + project.name + ' now');

            deployment = exec(project.deploymentCommand);
            deployment.on('exit', function() {
                console.log(project.name + ' deployment ended');
                delete deployments[project.name];
                if (project.redeploy) deploy(project);
            });


            var commands = [
                'cd ' + location,
                'git pull origin ' + project.branch,
                './deploy'
                // './.watchmen_deploying'
            ];
            
            project.deploymentCommand = commands.join(' && ');

            deployments[project.name] = deployment;
        }
    };

    github.on('push', function(repo, ref, data) {
        var project = retrieve(repo, data);
        deploy(project);
    });

    watching = readDB();

    _.each(watching, deploy);

    console.log(watching);


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