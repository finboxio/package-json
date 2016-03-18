'use strict';
var got = require('got');
var registryUrl = require('registry-url');
var rc = require('rc');
var semver = require('semver');
var URL = require('url')

module.exports = function (name, version) {
	var scope = name.split('/')[0];
	var registry_url = registryUrl(scope)
	if (!registry_url.endsWith('/')) registry_url += '/'
	var url = registry_url + encodeURIComponent(name).replace(/^%40/, '@');
	var npmrc = rc('npm');
	var registry = npmrc[scope + ':registry']
	if (registry) registry = '//' + URL.parse(registry).host + '/'
	var token = npmrc[(registry || scope) + ':_authToken'] || npmrc['//registry.npmjs.org/:_authToken'];
	var headers = {};

	if (token) {
		if (process.env[scope.toUpperCase() + '_NPM_TOKEN']) {
			token = token.replace('${' + scope.toUpperCase() + '_NPM_TOKEN}', process.env.NPM_TOKEN);
		}

		if (process.env.NPM_TOKEN) {
			token = token.replace('${NPM_TOKEN}', process.env.NPM_TOKEN);
		}

		headers.authorization = 'Bearer ' + token;
	}

	return got(url, {
		json: true,
		headers: headers
	})
		.then(function (res) {
			var data = res.body;

			if (version === 'latest') {
				data = data.versions[data['dist-tags'].latest];
			} else if (version) {
				if (!data.versions[version]) {
					var versions = Object.keys(data.versions);
					version = semver.maxSatisfying(versions, version);

					if (!version) {
						throw new Error('Version doesn\'t exist');
					}
				}

				data = data.versions[version];

				if (!data) {
					throw new Error('Version doesn\'t exist');
				}
			}

			return data;
		})
		.catch(function (err) {
			if (err.statusCode === 404) {
				throw new Error('Package `' + name + '` doesn\'t exist');
			}

			throw err;
		});
};
