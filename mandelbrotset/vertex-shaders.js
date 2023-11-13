const VS = 
`#version 300 es

in vec2 position; // canvas coords -1 < x < 1, -1 < y < 1

uniform vec2 range;

out vec2 relativePosition; // relative position from centre

void main() {
  gl_Position = vec4(position, 0, 1);

  relativePosition = range * position; 
}
`;