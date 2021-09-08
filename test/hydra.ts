const { expect } = require('chai');
const { prepareForHydra, mockRegl } = require('./lib/util');

describe.skip('HydraSynth', function () {
  let HydraSynth;
  let canvas;
  let mocked;

  before(function () {
    mocked = mockRegl();
  });
  after(function () {
    mocked.reset();
  });

  beforeEach(function () {
    const { canvas: new_canvas } = prepareForHydra();

    canvas = new_canvas;

    HydraSynth = require('../index');
  });

  it('Sets up basic infrastructure', function () {
    const hydra = new HydraSynth({ autoLoop: false, makeGlobal: false, canvas });

    expect(hydra).to.be.an('object').and.to.include.keys(['s', 'a', 'audio', 'bpm']);

    expect(hydra.bpm).to.be.a('number').and.to.be.equal(60);
  });

  describe('makeGlobal', function () {
    it('Does not create global variables if set to false', function () {
      const prev_keys = Object.keys(global.window);

      // eslint-disable-next-line no-unused-vars
      const hydra = new HydraSynth({ autoLoop: false, makeGlobal: false, canvas });

      const new_keys = Object.keys(global.window).filter((x) => prev_keys.indexOf(x) < 0);

      expect(new_keys).to.have.lengthOf(0);
    });

    it('Creates expected global variables if set to true', function () {
      const transforms = require('../src/glsl/glsl-functions');

      const prev_keys = Object.keys(global.window);

      const hydra = new HydraSynth({ autoLoop: false, makeGlobal: true, canvas });

      const new_keys = Object.keys(global.window).filter((x) => prev_keys.indexOf(x) < 0);

      expect(new_keys)
        .to.be.an('array')
        .and.to.include.members([
          ...Object.entries(transforms)
            .filter(([, transform]) => transform.type === 'src')
            .map(([name]) => name),
          ...Array(hydra.s.length)
            .fill(1)
            .map((_, i) => `s${i}`),
          ...Array(hydra.audio.bins.length)
            .fill(1)
            .map((_, i) => `a${i}`),
          'bpm',
          'mouse',
          'time',
          'a',
          'synth',
          'render',
          'screencap',
          'vidRecorder',
        ]);
    });
  });
});