var gulp = require('gulp');
  gutil = require('gulp-util');
  uglify = require('gulp-uglify');
  concat = require('gulp-concat');
  cssmin = require('gulp-cssmin');
  rename = require('gulp-rename');

  gulp.task('build-refreshjs', function () {
    gulp.src(
      [
        'src/lib/FlexDigest.js',
        'src/Refresh.js',
        ]
       )
      .pipe( concat('refresh.full.js') ).on('error', errorHandler)
      .pipe( gulp.dest('./dist') ).on('error', errorHandler)
      .pipe( uglify() ).on('error', errorHandler)
      .pipe( concat('refresh.min.js') ).on('error', errorHandler)
      .pipe( gulp.dest('./dist') ).on('error', errorHandler)
  });

gulp.task('default', ['watch']);

gulp.task('watch', function () {
    gulp.watch( 'src/*js', ['build-refreshjs'] );
    gulp.watch( 'src/lib/*js', ['build-refreshjs'] );
});

function errorHandler ( error ) {
    console.log( error.toString() );
    this.emit('end');
}
