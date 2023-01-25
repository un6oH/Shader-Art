function main() {
  // initialise canvas
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }

  // set canvas size to client canvas size
  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;

  const aoiMapWidth = 200;
  const aoiMapHeight = Math.floor(aoiMapWidth * canvas.height / canvas.width);

  /** initialise programs */
  // update velocity program
  const updatePositionProgram = createProgram(gl, UPDATE_POSITION_VS, UPDATE_POSITION_FS, ['newPosition', 'newVelocity']);
  const updatePositionLocations = {
    position: gl.getAttribLocation(updatePositionProgram, "position"),
    velocity: gl.getAttribLocation(updatePositionProgram, "position"),
    velocityAoiMap: gl.getUniformLocation(updatePositionProgram, "velocityAoiMap"), 
    positionAoiMap: gl.getUniformLocation(updatePositionProgram, "positionAoiMap"), 
    deltaTime: gl.getUniformLocation(updatePositionProgram, "deltaTime"), 
    speed: gl.getUniformLocation(updatePositionProgram, "speed"), 
    separationF: gl.getUniformLocation(updatePositionProgram, "separationF"), 
    alignmentF: gl.getUniformLocation(updatePositionProgram, "alignmentF"), 
    cohesionF: gl.getUniformLocation(updatePositionProgram, "cohesionF"), 
    canvasDimensions: gl.getUniformLocation(updatePositionProgram, "canvasDimensions"), 
    aoiMapDimensions: gl.getUniformLocation(updatePositionProgram, "aoiMapDimensions"), 
  };
  gl.uniform1i(updatePositionLocations.velocityAoiMap, 0);
  gl.uniform1i(updatePositionLocations.positionAoiMap, 1);
  gl.uniform2f(updatePositionLocations.canvasDimensions, canvas.width, canvas.height);
  gl.uniform2f(updatePositionLocations.aoiMapDimensions, aoiMapWidth, aoiMapHeight);

  // draw velocity aoi program
  const drawVelocityAoiProgram = createProgram(gl, DRAW_VELOCITY_AOI_VS, DRAW_VELOCITY_AOI_FS);
  const drawVelocityAoiLocations = {
    position: gl.getAttribLocation(drawVelocityAoiProgram, "position"), 
    velocity: gl.getUniformLocation(drawVelocityAoiProgram, "velocity"),  
    canvasDimensions: gl.getUniformLocation(drawVelocityAoiProgram, "canvasDimensions"),  
    aoiMapDimensions: gl.getUniformLocation(drawVelocityAoiProgram, "aoiMapDimensions"),  
  }
  gl.uniform2f(drawVelocityAoiLocations.canvasDimensions, canvas.width, canvas.height);
  gl.uniform2f(drawVelocityAoiLocations.aoiMapDimensions, aoiMapWidth, aoiMapHeight);

  const drawPositionAoiProgram = createProgram(gl, DRAW_POSITION_AOI_VS, DRAW_POSITION_AOI_FS);
  const drawPositionAoiLocations = {
    position: gl.getAttribLocation(drawPositionAoiProgram, "position"), 
    centre: gl.getUniformLocation(drawPositionAoiProgram, "centre"),  
    canvasDimensions: gl.getUniformLocation(drawPositionAoiProgram, "canvasDimensions"),  
    aoiMapDimensions: gl.getUniformLocation(drawPositionAoiProgram, "aoiMapDimensions"),  
  }
  gl.uniform2f(drawPositionAoiLocations.canvasDimensions, canvas.width, canvas.height);
  gl.uniform2f(drawPositionAoiLocations.aoiMapDimensions, aoiMapWidth, aoiMapHeight);

  // display program
  const displayProgram = createProgram(gl, DISPLAY_VS, DISPLAY_FS);
  const displayLocations = {
    position: gl.getAttribLocation(displayProgram, "position"), 
    colour: gl.getAttribLocation(displayProgram, "colour"), 
    canvasDimensions: gl.getUniformLocation(displayProgram, "canvasDimensions"),  
    aoiMapDimensions: gl.getUniformLocation(displayProgram, "aoiMapDimensions"),
  }
  gl.uniform2f(displayLocations.canvasDimensions, canvas.width, canvas.height);
  gl.uniform2f(displayLocations.aoiMapDimensions, aoiMapWidth, aoiMapHeight);

  
}

main();