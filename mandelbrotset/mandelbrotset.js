function main() {
  let canvas = document.querySelector("#gl-canvas");

  let gl = canvas.getContext("webgl2");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }
  gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('EXT_float_blend');
  gl.getExtension('OES_texture_float_linear');

  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;

  console.log("creating program");
  let program = createProgram(gl, VS, FS);
  let locations = createLocations(gl, program, ["position"], ["centre", "range", "maxIterations", "expOffset"]);

  let positions = [
    -1, 1, 1, 1, 1, -1, 
    -1, 1, 1, -1, -1, -1,
  ];
  let positionBuffer = makeBuffer(gl, new Float32Array(positions), gl.STATIC_DRAW);

  let centre = [-0.7499389648, 2**-6];
  let range = [2**-18, 2**-18];
  const maxFloat = 2**63;
  let mag = maxMag(centre, range);
  console.log("max mag = " + mag);
  let offsetExp = Math.log2(maxFloat) - Math.log2(mag);
  let expOffset = 2**Math.floor(offsetExp); // offset is a power of 2 such that x^2 * offset^2 does not exceed the max float
  console.log("max square = " + (mag*expOffset)**2);
  // let expOffset = 1;

  let maxIterations = 1000;

  gl.useProgram(program);
  
  gl.viewport(0, 0, canvas.width, canvas.height);

  bindBuffer(gl, positionBuffer, locations.position, 2, gl.FLOAT, false, 0, 0);
  
  gl.uniform2f(locations.centre, centre[0] * expOffset, centre[1] * expOffset);
  gl.uniform2f(locations.range, range[0] * expOffset, range[1] * expOffset);
  gl.uniform1i(locations.maxIterations, maxIterations);
  gl.uniform1f(locations.expOffset, expOffset);

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  console.log("range: " + (centre[0]-range[0]) + ", " + (centre[1]-range[1]) + " to " + (centre[0]+range[0]) + ", " + (centre[1]+range[1]));

  function draw(centre, range, expOffset, maxIterations) {
    gl.useProgram(program);
    gl.viewport(0, 0, canvas.width, canvas.height);
    bindBuffer(gl, positionBuffer, locations.position, 2, gl.FLOAT, false, 0, 0);
  }
}

function maxMag(centre, range) {
  let points = [
    centre[0] - range[0], centre[1] - range[1], 
    centre[0] - range[0], centre[1] + range[1], 
    centre[0] + range[0], centre[1] - range[1], 
    centre[0] + range[0], centre[1] + range[1],   
  ];
  let mags = new Array(4).fill(0).map((v, i) => i*2).map((i) => Math.sqrt(points[i]**2 + points[i+1]**2));
  let max = 0;
  for (let i = 0; i < 4; i++) {
    if (mags[i] > max) {
      max = mags[i];
    }
  }
  return max;
}

main();