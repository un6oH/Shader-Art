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
  // canvas.width = 3240;
  // canvas.height = 2160;

  console.log("creating program");
  let program = createProgram(gl, VS, FS);
  let locations = createLocations(gl, program, ["position"], ["centre", "range", "prec", "maxIterations"]);
  let positions = [
    -1, 1, 1, 1, 1, -1, 
    -1, 1, 1, -1, -1, -1,
  ];
  let positionBuffer = makeBuffer(gl, new Float32Array(positions), gl.STATIC_DRAW);

  let centre = [-0.6246522899203832,0.39701429960462775];
  let xRange = 2 ** -22;
  let yRange = xRange / canvas.width * canvas.height;
  // let range = new Array(2).fill(2 ** -18);
  let range = [xRange, yRange];

  let prec = 2 ** -23;
  let maxIterations = 1000;

  draw();

  function draw() {
    gl.useProgram(program);
    gl.viewport(0, 0, canvas.width, canvas.height);
    bindBuffer(gl, positionBuffer, locations.position, 2, gl.FLOAT, false, 0, 0);

    let rfCentre = new Float32Array(4);
    rfCentre[1] = centre[0] % prec;
    rfCentre[0] = (centre[0] - rfCentre[1]);
    rfCentre[3] = centre[1] % prec;
    rfCentre[2] = (centre[1] - rfCentre[3]);
    console.log("rfCentre: " + rfCentre);

    gl.uniform4fv(locations.centre, rfCentre);
    gl.uniform2fv(locations.range, range);
    gl.uniform1f(locations.prec, prec);
    gl.uniform1i(locations.maxIterations, maxIterations);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function planeCoords(mouseCoords) {
    return [
      centre[0] + range[0] * (2 * mouseCoords[0] / canvas.width - 1),
      centre[1] + range[1] * -(2 * mouseCoords[1] / canvas.height - 1)
    ];
  }

  document.addEventListener('click', (event) => {
    let mousePos = planeCoords([event.clientX, event.clientY]);
    centre = mousePos;
    console.log("centre: " + centre + "\nmousePos: " + mousePos);
    draw();
  });

  document.addEventListener('keypress', (event) => {
    if (event.key == 'i') {
      prec /= 2;
      draw();
    } else if (event.key == 'o') {
      prec *= 2;
      draw();
    }
    console.log("precision = 2 ^ " + Math.log2(prec))
  });

  document.addEventListener('wheel', (event) => {
    let mousePos = planeCoords([event.clientX, event.clientY]);

    let direction = Math.sign(event.deltaY);
    range = range.map(v => v * 2**direction);

    centre = [centre[0] + direction * (centre[0] - mousePos[0]) * 0.5, centre[1] + direction * (centre[1] - mousePos[1]) * 0.5];
    draw();
  });
}

main();