'use strict';

const fs = require('fs');
const gulp = require('gulp');
const clean = require('gulp-clean');
const exec = require('gulp-exec');
const runSequence = require('run-sequence');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const pump = require('pump');

gulp.task('clean', () => {
  if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist');
  }
  return gulp.src('./dist/*', {read: false})
        .pipe(clean({force: true}));
});

gulp.task('compress', cb => {
  pump([
    gulp.src('./dist/convert2ots.js'),
    uglify(),
    rename('convert2ots.min.js'),
    gulp.dest('./dist/')
  ],
        cb
    );
});

gulp.task('index', () => {
  const options = {
    continueOnError: false, // default = false, true means don't emit error event
    pipeStdout: false, // default = false, true means stdout is written to file.contents
    customTemplatingThing: 'test' // content passed to gutil.template()
  };
  const reportOptions = {
    err: true, // default = true, false means don't write err
    stderr: true, // default = true, false means don't write stderr
    stdout: true // default = true, false means don't write stdout
  };

  return gulp.src('./')
        .pipe(exec('./node_modules/browserify/bin/cmd.js -r ./src/convert2ots.js ./lib.js -o ./dist/convert2ots.es6.js -s convert2ots --insert-globals', options))
        .pipe(exec('./node_modules/babel-cli/bin/babel.js ./dist/convert2ots.es6.js -o ./dist/convert2ots.js', options))
        .pipe(exec.reporter(reportOptions));

    /* NOTE: babelify run babel with .babelrc file, but doesn't convert the code
    gulp.task('index', function() {
        return browserify({ debug: true, entries: [" opentimestamps.es6.js"] })
            .transform(babelify)
            .bundle()
            .pipe(source(' opentimestamps.js'))
            .pipe(gulp.dest('./'));
    }); */
});

gulp.task('default', done => {
  runSequence('clean', 'index', 'compress', () => {
    done();
  });
});
