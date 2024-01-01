const VS = 
`#version 300 es

in vec2 position; // canvas coords -1 < x < 1, -1 < y < 1

uniform vec2 centre;
uniform vec2 range;
uniform float prec;

out vec2 relativePosition; // relative position from centre
out vec4 rfcentre;

float p;

vec2 rfComponents(float a) { // deconstruction
  float q = a / p;
  float g = p * floor(q); // gross component
  float f = (a - g) / p; // fine component
  return vec2(g, f);
}

void main() {
  p = prec;
  
  gl_Position = vec4(position, 0, 1);

  relativePosition = range * position; 
  rfcentre = vec4(rfComponents(centre.x), rfComponents(centre.y));
}
`;