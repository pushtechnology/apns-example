#!/usr/bin/env node
/*jshint esversion: 6 */

const diffusion = require('diffusion');
const urlParser = require('url');
const commander = require('commander');

function buildSessionOptionsFromURL(urlStr) {
	// Process the URL
	const url = urlParser.parse(urlStr);

	if (null === url.host || url.pathname === null)  {
		return null;
	}

	var result = {
		reconnect: false,
		host : url.hostname,
		rootTopic : url.pathname.substring(1)
	};

	if (null !== url.port) {
		result.port = url.port;
	}

	if (null !== url.auth) {
		const urlCredentials = url.auth.split(":");
		result.principal = urlCredentials[0];
		result.credentials = urlCredentials[1];
	}

	return result;
}

function buildConfigFromArgs(argv) {
	var result = {
		sessionOptions: {
			reconnect: false
		}
	};

	commander
		.version('0.0.1')
		.option('-p, --port <portnumber>', 'Server port', parseInt)
		.option('-u, --principal <username>', 'User principal')
		.option('-c, --credentials <password>', 'User credentials/password')
		.arguments('<host> <topicpath> <topicvalue>')
		.action(function(host, rootTopic, topicValue) {
			result.sessionOptions.host = host;
			result.rootTopic = rootTopic;
			result.topicValue = topicValue;
		}).parse(argv);
	if(typeof result.sessionOptions.host === 'undefined' || typeof result.rootTopic === 'undefined' || typeof result.topicValue === 'undefined') {
		commander.outputHelp();
		process.exit(1);
	}

	if(commander.port) {result.sessionOptions.port = commander.port;}
	if(commander.principal) {result.sessionOptions.principal = commander.principal;}
	if(commander.credentials) {result.sessionOptions.credentials = commander.credentials;}
	return result;
}

const config = buildConfigFromArgs(process.argv);

diffusion.connect(config.sessionOptions).then(function(session){
	console.log("Connected to", config.sessionOptions.host);

	session.topics.add(config.rootTopic, config.topicValue).then(function(result){
		if (result.added) {
			console.log("Created", config.rootTopic, "with value", config.topicValue);
		} else {
			console.log("Updated", config.rootTopic, "with value", config.topicValue);
		}
		process.exit(0);
	}, function(addFailureSeason){
		if(addFailureSeason.id == 2 /*diffusion.topics.EXISTS_MISMATCH*/) {
			session.topics.update(config.rootTopic, config.topicValue).then(function(){
				console.log("Updated", config.rootTopic, "to", config.topicValue);
				process.exit(0);
			}, function(reason){
				console.error("Cannot update", config.rootTopic, reason);
				process.exit(1);
			});
		} else {
			console.error("Cannot add topic", config.rootTopic, addFailureSeason);
			process.exit(1);
		}
	});
}, function(reason) {
    console.warn("Cannot connect to", config.sessionOptions.host, reason.message);
	process.exit(1);
});