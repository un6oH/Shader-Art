const VS = 
`#version 300 es

in vec2 position; // canvas coords -1 < x < 1, -1 < y < 1

uniform vec2 centre; // coords of centre, offset by expOffset
uniform vec2 range; // radius of region of plane shown, offset

out vec2 planeCoord;

void main() {
  gl_Position = vec4(position, 0, 1);

  planeCoord = centre + range * position; 
}

`;