module.exports = function (config) {
  return function fileOutput (job, ffmpeg, done) {
    ffmpeg
      .save(job.data.output.path)
      .on('progress', onProgress)
      .on('error', function(err) {
        done(err);
      })
      .screenshots({
        count: 1,
        folder: job.data.thumb.path,
        filename: job.data.thumb.filename,
      })
      .on('end', function (stdout, stderr, err) {
        job.progress(100, 100)
        done()
      })

    job.on('failed', function() {
      ffmpeg.kill();
    });

    function onProgress (progress) {
      job.progress(Math.round(progress.percent), 100);
      console.log(Math.round(progress.percent));
    }
  }
}
