var gulp = require("gulp");
var gutil = require("gulp-util");
var gulpif = require("gulp-if");
var streamify = require("gulp-streamify");
var autoprefixer = require("gulp-autoprefixer");
var less = require("gulp-less");
var concat = require("gulp-concat");
var plumber = require("gulp-plumber");
var source = require("vinyl-source-stream");
var babelify = require("babelify");
var browserify = require("browserify");
var watchify = require("watchify");
var uglify = require("gulp-uglify");

var production = process.env.NODE_ENV === "production";

var dependencies = [
	"alt",
	"react",
	"react-dom",
	"react-router",
	"underscore"
];

/*
 |--------------------------------------------------------------------------
 | Combine all JS libraries into a single file for fewer HTTP requests.
 |--------------------------------------------------------------------------
 */
gulp.task("vendor", function() {
	return gulp.src([
			"bower_components/jquery/dist/jquery.js",
			"bower_components/fastclick/lib/fastclick.js",
			"bower_components/bootstrap/dist/js/bootstrap.js"
		])
		.pipe(concat("vendor.js"))
		.pipe(gulpif(production, uglify({
			mangle: false
		})))
		.pipe(gulp.dest("js/build"));
});

/*
 |--------------------------------------------------------------------------
 | Compile third-party dependencies separately for faster performance.
 |--------------------------------------------------------------------------
 */
gulp.task("browserify-vendor", function() {
	return browserify()
		.require(dependencies)
		.bundle()
		.pipe(source("vendor.bundle.js"))
		.pipe(gulpif(production, streamify(uglify({
			mangle: false
		}))))
		.pipe(gulp.dest("js/build"));
});

/*
 |--------------------------------------------------------------------------
 | Compile only project files, excluding all third-party dependencies.
 |--------------------------------------------------------------------------
 */
gulp.task("browserify", ["browserify-vendor"], function() {
	return browserify("js/main.js")
		.external(dependencies)
		.transform(babelify)
		.bundle()
		.pipe(source("bundle.js"))
		.pipe(gulpif(production, streamify(uglify({
			mangle: false
		}))))
		.pipe(gulp.dest("js/build"));
});

/*
 |--------------------------------------------------------------------------
 | Same as browserify task, but will also watch for changes and re-compile.
 |--------------------------------------------------------------------------
 */
gulp.task("browserify-watch", ["browserify-vendor"], function() {
	var bundler = watchify(browserify("js/main.js", watchify.args));
	bundler.external(dependencies);
	bundler.transform(babelify);
	bundler.on("update", rebundle);
	return rebundle();

	function rebundle() {
		var start = Date.now();
		return bundler.bundle()
			.on("error", function(err) {
				gutil.log(gutil.colors.red(err.toString()));
			})
			.on("end", function() {
				gutil.log(gutil.colors.green("Finished rebundling JS in", (Date.now() - start) + "ms."));
			})
			.pipe(source("bundle.js"))
			.pipe(gulp.dest("js/build"));
	}
});

gulp.task("default", ["vendor", "browserify-watch"]);
gulp.task("build", ["vendor", "browserify"]);
