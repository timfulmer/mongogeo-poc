/**
 * Created by timfulmer on 10/25/14.
 */
var gulp=require('gulp')
  ,istanbul=require('gulp-istanbul')
  ,mocha=require('gulp-mocha');

gulp.task('test', function (cb) {
    gulp.src(['lib/**/*.js', 'main.js'])
        .pipe(istanbul())
        .on('finish', function () {
            gulp.src(['test/**/*.js'])
                .pipe(mocha())
                .pipe(istanbul.writeReports())
                .on('end', cb);
        });
});
