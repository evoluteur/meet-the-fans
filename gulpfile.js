'use strict';

var gulp = require('gulp');
var concat = require('gulp-concat');
var minifyCSS = require('gulp-minify-css');
var uglify = require('gulp-uglify-es').default;
var header = require('gulp-header');
var pkg = require('./package.json');

var banner = '/*\n meet-the-fans v'+pkg.version+'\n https://github.com/evoluteur/meet-the-fans\n (c) 2020 Olivier Giulieri \n*/\n'

gulp.task('css', function(){
  return gulp.src('css/meet-the-fans.css')
    .pipe(minifyCSS())
    .pipe(concat('meet-the-fans.min.css'))
    .pipe(header(banner, { pkg : pkg }))
    .pipe(gulp.dest('dist'))
});

gulp.task('js', function () {
  return gulp.src(['js/data.js','js/graph.js','js/views.js'])
    .pipe(uglify())
    .pipe(concat('meet-the-fans.min.js'))
    .pipe(header(banner, { pkg : pkg }))
    .pipe(gulp.dest('dist'));
});

gulp.task('default', gulp.parallel('css', 'js'));