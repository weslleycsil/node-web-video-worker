var kue   = require('kue')
var os    = require('os')

/**
 * Wrapper around kue for processing videos
 *
 * @constructor
 * @param {Object} options
 */
function WebVideoWorker (options) {
  var worker = this

  options              || (options = {})
  options.redisPort    || (options.redisPort = 6379)
  options.redisHost    || (options.redisHost = '127.0.0.1')
  options.queue        || (options.queue = 'web-video')
  options.workers      || (options.workers = 2)
  options.log          || (options.log = console)
  options.log2         = console.error
  worker.options       = options

  // Alias for worker.options.log
  worker.log           = options.log
  worker.log2          = options.log2

  worker.inputs        =
    { file             : require('../inputs/file.js')(worker.options)
    }
  worker.outputs       =
    { file             : require('../outputs/file.js')(worker.options)
    , 'file-faststart' : require('../outputs/file-faststart.js')(worker.options)
    }
  worker.presets       = {
    'mp4.h264.1080': require('../presets/mp4.h264.1080.js')(worker.options),
    'mp4.h264.720': require('../presets/mp4.h264.720.js')(worker.options),
    'mp4.h264.720.low': require('../presets/mp4.h264.720.low.js')(worker.options),
    'mp4.h264.480': require('../presets/mp4.h264.480.js')(worker.options),
    'mp4.h264.480.low': require('../presets/mp4.h264.480.low.js')(worker.options),
    'webm.1080': require('../presets/webm.1080.js')(worker.options),
    'webm.720': require('../presets/webm.720.js')(worker.options),
    'webm.720.low': require('../presets/webm.720.low.js')(worker.options),
    'webm.480': require('../presets/webm.480.js')(worker.options),
    'ogv.1080': require('../presets/ogv.1080.js')(worker.options),
    'ogv.720.low': require('../presets/ogv.720.low.js')(worker.options),
    'ogv.480': require('../presets/ogv.480.js')(worker.options)
  };

  worker.queue = kue.createQueue({
    redis: {
      host: worker.options.redisHost,
      port: worker.options.redisPort,
      auth: worker.options.redisAuth
    }
  })

  worker.queue.process(
    worker.options.queue
  , worker.options.workers
  , function (job, done) {
      worker.process(job, done)
    }
  )
}

module.exports = WebVideoWorker
var proto = WebVideoWorker.prototype

WebVideoWorker.CPUS = os.cpus().length

/**
 * Add an input
 *
 * @param String   name
 * @param Function module
 */
proto.input = function input (name, module) {
  if (module) {
    this.inputs[name] = module(this.options)
    return this
  }
  return this.inputs[name]
}

/**
 * Add an output
 *
 * @param String   name
 * @param Function module
 */
proto.output = function output (name, module) {
  if (module) {
    this.outputs[name] = module(this.options)
    return this
  }
  return this.outputs[name]
}

/**
 * Add an preset
 *
 * @param String   name
 * @param Function module
 */
proto.preset = function preset (name, module) {
  if (module) {
    this.presets[name] = module(this.options)
    return this
  }
  return this.presets[name]
}

/**
 * Process an encoding job
 *
 * @param kue.Job  job
 * @param Function done
 */
proto.process = function process (job, done) {
  var worker = this
  var s = {}

  worker.log2('[JOB]', job.id, 'Processing')

  // Create the ffmpeg object from input data
  worker.log2('[JOB]', job.id, 'Input', job.data.input)
  worker.input(job.data.input.type)(job, gotInput)

  // Load preset
  function gotInput (error, ffmpeg) {
    if (error) {
      worker.log.error(err)
      return done(err)
    }

    worker.log2('[JOB]', job.id, 'Preset', job.data.preset)
    worker.preset(job.data.preset)(job, ffmpeg)

    // Set threads to cpu count
    ffmpeg.addOption('-threads', WebVideoWorker.CPUS)

    // Do output
    worker.log2('[JOB]', job.id, 'Output', job.data.output)
    worker.output(job.data.output.type)(job, ffmpeg, doneOutput)

    // Echo command
    var args = ffmpeg._getArguments()
    worker.log2('[JOB]', job.id, 'Command:', 'ffmpeg', args)
  }

  function doneOutput (err) {
    if (err) {
      worker.log.error(err)
      return done(err)
    }
    worker.log2('[JOB]', job.id, 'Complete')
    done()
  }
}
