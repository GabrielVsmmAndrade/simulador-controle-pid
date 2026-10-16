const mongoose = require('mongoose');

const simulationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    plantType: {
      type: String,
      required: true,
    },
    plantParams: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    pid: {
      kp: { type: Number, required: true },
      ki: { type: Number, required: true },
      kd: { type: Number, required: true },
    },
    setpoint: {
      type: Number,
      required: true,
    },
    dt: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    results: {
      time: [Number],
      output: [Number],
      control: [Number],
      error: [Number],
    },
    metrics: {
      overshootPercent: Number,
      riseTime: Number,
      settlingTime: Number,
      steadyStateError: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Simulation', simulationSchema);
