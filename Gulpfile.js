var gulp = require('gulp')
var babel = require('gulp-babel')
var concat = require('gulp-concat')
var rjs = require('gulp-requirejs')

gulp.task('babel', function () {
  return gulp.src('src/**/*')
    .pipe(babel({ modules: 'ignore' }))
    .pipe(gulp.dest('build/babel/'))
})

gulp.task('rjs', [ 'babel' ], function () {
  rjs({
    baseUrl: 'build/babel/',
    name: 'extplug/ExtPlug',
    paths: {
      // plug-modules defines, these are defined at runtime
      // so the r.js optimizer can't find them
      plug: 'empty:',
      backbone: 'empty:',
      jquery: 'empty:',
      underscore: 'empty:'
    },
    out: 'build.rjs.js'
  }).pipe(gulp.dest('build/'))
})

gulp.task('build', [ 'rjs' ], function () {
  return gulp.src([ 'node_modules/plug-modules/plug-modules.js'
                  , 'build/build.rjs.js'
                  , 'src/modules/*'
                  , 'src/extplug/plugdj.user.js' ])
    .pipe(concat('build.full.js'))
    .pipe(gulp.dest('build/'))
})