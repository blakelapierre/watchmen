var githubhook = require('githubhook'),
    _ = require('underscore');
    

exports.startServer = function (config, callback) {
    var github = githubhook(config.server);

    github.listen();
    
    github.on('event', function(repo, ref, data) {
        
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