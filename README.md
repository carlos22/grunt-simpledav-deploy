# grunt-simpledav-deploy

This is a fork of https://www.npmjs.com/package/grunt-simpledav-upload.

Differences:

* Does not delete any stuff
* Has integrated mkdir-p method to allow recursive uploads
* Updated dependencies

## Usage Example

```
sudo npm install -g grunt
npm init # you might skip this if you have a package.json
npm install grunt grunt-simpledav-upload grunt-contrib-watch grunt-simpledav-deploy --save
```

`Gruntfile.js`

```js
module.exports = function(grunt) {

  grunt.initConfig({
    davupload: {
      files: ['**/assets/*.*', '**/src/*.js'],
      options: {
	urlBase: 'https://example.com/dav',
	target: 'myapp/',
      }
    },
    watch: {
      files: ['<%= davupload.files %>'],
      tasks: ['davupload']
    }
  });

  grunt.loadNpmTasks('grunt-simpledav-deploy');
  grunt.loadNpmTasks('grunt-contrib-watch');

};
```

`.simpledavrc`

```json
{"user": "<username>", "passwd": "<pass>"}
```

Run with: `grunt davupload`

Or upload on changes: `grunt watch`

Works but has still some edges. 

## TODO

* Allow the upload of only changed files. How?
* Use this.files in a grunt standard way with all options (e.g. dest: etc.) This is a bit hacky currently.
