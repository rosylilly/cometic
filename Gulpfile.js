var NwBuilder = require('node-webkit-builder');
var gulp = require('gulp');
var gutil = require('gulp-util');

gulp.task('build-all', function () {
    var nw = new NwBuilder({
        version: '0.12.0-alpha2',
        files: ['package.json', './node_modules/zip/**/*.js*', './src/**'],
        winIco: './icons/cometic.ico',
        macIcns: './icons/cometic.icns',
        macPlist: {
          mac_document_types: [
            {
              name: "Zip Archive",
              extensions: ["zip", "epub"],
              role: "Viewer",
              isDefault: false
            }
          ],
        },
        macZip: true,
        platforms: ['win32', 'win64', 'osx32', 'osx64']
    });

    // Log stuff you want
    nw.on('log', function (msg) {
        gutil.log('node-webkit-builder', msg);
    });

    // Build returns a promise, return it so the task isn't called in parallel
    return nw.build().catch(function (err) {
        gutil.log('node-webkit-builder', err);
    });
});

gulp.task('build', function () {
    var nw = new NwBuilder({
        version: '0.12.0-alpha2',
        files: ['package.json', './node_modules/zip/**/*.js*', './src/**'],
        macIcns: './icons/cometic.icns',
        macPlist: {
          mac_document_types: [
            {
              name: "Zip Archive",
              extensions: ["zip", "epub"],
              role: "Viewer",
              isDefault: false
            }
          ],
        },
        macZip: true,
        platforms: ['osx64']
    });

    // Log stuff you want
    nw.on('log', function (msg) {
        gutil.log('node-webkit-builder', msg);
    });

    // Build returns a promise, return it so the task isn't called in parallel
    return nw.build().catch(function (err) {
        gutil.log('node-webkit-builder', err);
    });
});

gulp.task('default', ['build']);
