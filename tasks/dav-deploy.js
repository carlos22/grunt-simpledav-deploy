'use strict';

var webdav = require('webdav-fs'),
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	url = require('url');

// webdav version based on https://github.com/substack/node-mkdirp/blob/master/index.js
function mkdirP (p, opts, f, made) {
	if (typeof opts === 'function') {
		f = opts;
		opts = {};
	}
	else if (!opts || typeof opts !== 'object') {
		opts = { mode: opts };
	}

	var mode = opts.mode; // unused
	var xfs = opts.fs || fs;

	if (!made) made = null;

	var cb = f || function () {};

	xfs.mkdir(p, function (er) {
		if (!er) {
			made = made || p;
			return cb(null, made);
		}
		switch (er.status) {
			case 409:
				mkdirP(path.dirname(p), opts, function (er, made) {
					if (er) cb(er, made);
					else mkdirP(p, opts, cb, made);
				});
				break;

			// In the case of any other error, just see if there's a dir
			// there already.  If so, then hooray!  If not, then something
			// is borked.
			default:
				xfs.stat(p, function (er2, stat) {
					// if the stat fails, then that's super weird.
					// let the original error be the failure reason.
					if (er2 || !stat.isDirectory()) cb(er, made)
					else cb(null, made);
				});
				break;
		}
	});
}

module.exports = function(grunt) {
	var options;

	grunt.registerMultiTask('davupload', 'Webdav task', function() {
		options = this.options({
		});

		grunt.log.debug('Preparing copy...', this.files);

		var rc = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '.simpledavrc'))),
			//wfs = webdav(options.urlBase, encodeURIComponent(rc.user), encodeURIComponent(rc.passwd)),
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
						// transfer file (called from below)
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
							// TODO: check if file exists?
							wfs2.writeFile(path.join(options.target, file), fs.readFileSync(file), 'utf8', function(err) {
								if(err)
									return callback(err);
								grunt.log.writeln('Copying: ' + file);
								callback();
							});
						};
						// check if dirname of current file exists
						var wfs = webdav(options.urlBase, rc.user, rc.passwd);
						var currentFileTargetDir = path.dirname(path.join(options.target, file));
						grunt.log.debug('Read currentFileTargetDir,', currentFileTargetDir);
						wfs.readdir(currentFileTargetDir, function(err, result) {
							if(err) {
								// create folder if it does not exist
								if(err.status && err.status === 404) {
									grunt.log.debug('Creating new folder', currentFileTargetDir);
									mkdirP(currentFileTargetDir, {fs: wfs}, transferNextFile);
								} else {
									grunt.log.error(err);
								}
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

	});
};
