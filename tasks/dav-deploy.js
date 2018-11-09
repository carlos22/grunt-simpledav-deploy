'use strict';

var webdav = require('webdav-fs'),
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	url = require('url');


module.exports = function(grunt) {
	var options;

	grunt.registerMultiTask('davupload', 'Webdav task', function() {
		options = this.options({
			overwrite: false
		});

		grunt.log.debug('Preparing copy...', this.files);

		var rc = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '.simpledavrc'))),
			wfs = webdav(options.urlBase, encodeURIComponent(rc.user), encodeURIComponent(rc.passwd)),
			done = this.async(),
			files = this.files.map(function(file) {return file.src;})[0], // TODO: flattern?
			filesLength = files.length,
			transferFiles = function(err) {
				if(err) {

					grunt.log.error(err);
					return done(false);
				}

				async.waterfall(files.map(function(file) {
					return function(callback) {
						grunt.log.debug('path', options.target, file);

						var currentFileTargetDir = path.dirname(path.join(options.target, file));

						var transferNextFile = function (err) {
							if(err) {
								grunt.log.error(err);
								return done(false);
							}
							grunt.log.debug('Write File', path.join(options.target, file));
							// TODO: why can't we use encodeUIRComponent here?
							var wfs2 = webdav(options.urlBase, rc.user, rc.passwd);
							// skip directories (created before)
							if(fs.statSync(file).isDirectory()) {
								callback();
								return;
							}
							wfs2.writeFile(path.join(options.target, file), fs.readFileSync(file), 'utf8', function(err) {
								if(err)
									return callback(err);
								grunt.log.writeln('Copying: ' + file);
								callback();
							});
						};

						wfs.readdir(currentFileTargetDir, function(err, result) {
							if(err && err.httpStatusCode && err.httpStatusCode === 404) {
								grunt.log.debug('Creating new folder', currentFileTargetDir);
								wfs.mkdir(currentFileTargetDir, transferNextFile);
							} else {
								grunt.log.debug('Folder exists', currentFileTargetDir);
								transferNextFile();
							}
						});

					};
				}), done);
			};

		grunt.log.debug('Connected, file paths ready...');
		grunt.log.debug('Copying files: ', files);
		grunt.log.debug('To: ' + url.resolve(options.urlBase + '/', options.target));

		// go
		transferFiles();

		/*wfs.readdir(options.target, function(err, result) {
			if(err && err.httpStatusCode && err.httpStatusCode === 404) {
				grunt.log.debug('Creating new folder...');
				wfs.mkdir(options.target, transferFiles);
			}
			else if(!err && options.overwrite) {
				grunt.log.writeln('Overwrinting...');
				wfs.unlink(options.target, function(err) {
					if(err)
						return callback(err);

					wfs.mkdir(options.target, transferFiles);
				});
			}
			else if(!err && !options.overwrite) {
				grunt.log.error('Impossible overwrite, to force this, use the option `overwrite`.');
				return done(false);
			}
			else if(err) {
				grunt.log.error(err);
				return done(false);
			}

		});*/
	});
};
