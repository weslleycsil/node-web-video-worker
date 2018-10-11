module.exports = function (config) {
  return function fileOutput (job, ffmpeg, done) {
    ffmpeg
      .output(job.data.output.path)
      .on('progress', onProgress)
      .on('error', function(err) {
        done(err);
      })
      .on('end', function (stdout, stderr, err) {
        job.progress(100, 100)
        done()
      })
      .screenshots({
        count: 1,
        folder: job.data.thumb.path,
        filename: job.data.thumb.filename,
      })

    job.on('failed', function() {
      ffmpeg.kill();
    });

    function onProgress (progress) {
      job.progress(Math.round(progress.percent), 100);
    }
  }
}
