const FSAdvect = `#version 300 es
precision highp float;

in vec2 position; // coordinates in texCoords

uniform sampler2D velocityField; // RG32F texture
uniform sampler2D pressureField; // R32F texture
uniform float deltaTime;
uniform vec2 dx; // simulation domain * dx = texture domain | texture domain * rdx = simulation domain

layout(location = 0) out vec2 velocity;
layout(location = 1) out float pressure;

void main() {
  vec2 v0 = texture(velocityField, position).xy; // velocity of fragment
  vec2 samplePosition = position - v0 * deltaTime * dx;

  velocity = texture(velocityField, samplePosition).xy;
  pressure = texture(pressureField, samplePosition).x;
}
`;

const FSDiffuse = `#version 300 es
precision highp float;

in vec2 position; // coordinates in texCoords
in vec2 position_l; // coordinates of left pixel in texCoords
in vec2 position_r; // coordinates of right pixel in texCoords
in vec2 position_t; // coordinates of top pixel in texCoords
in vec2 position_b; // coordinates of bottom pixel in texCoords

uniform sampler2D velocityResult; // Solution matrix * field = result
uniform sampler2D pressureResult; // Solution matrix * field = result
uniform sampler2D velocityField; // RG32F texture
uniform sampler2D pressureField; // R32F texture
uniform float deltaTime;
uniform vec2 dx; // simulation domain * dx = texture domain

layout(location = 0) out vec2 velocity;
layout(location = 1) out float pressure;

void main() {
  vec3 c = vec3(texture(velocityField, position).xy, texture(pressureField, position).x);
  vec3 l = vec3(texture(velocityField, position_l).xy, texture(pressureField, position_l).x);
  vec3 r = vec3(texture(velocityField, position_r).xy, texture(pressureField, position_r).x);
  vec3 t = vec3(texture(velocityField, position_t).xy, texture(pressureField, position_t).x);
  vec3 b = vec3(texture(velocityField, position_b).xy, texture(pressureField, position_b).x);
  vec3 result = vec3(texture(velocityResult, position).xy, texture(pressureResult, position).x);

  vec3 alpha = c * c / deltaTime;
  vec3 rBeta = 1.0 / (4.0 + alpha);
  vec3 new = (l + r + t + b + alpha * result) * rBeta;

  velocity = new.xy;
  pressure = new.z;
}
`;

// called in a point primitive
const FSApplyForce = `#version 300 es
precision highp float;

uniform vec2 force;
uniform float deltaTime;
uniform float splatRadius;

layout(location = 0) out vec2 velocity; // output is blended

void main() {
  velocity = force * deltaTime * length(gl_PointCoord.xy - splatRadius) / splatRadius;
}
`;

const FSDivergenceCalc = `#version 300 es
precision highp float;

in vec2 position; // coordinates in texCoords
in vec2 position_l; // coordinates of left pixel in texCoords
in vec2 position_r; // coordinates of right pixel in texCoords
in vec2 position_t; // coordinates of top pixel in texCoords
in vec2 position_b; // coordinates of bottom pixel in texCoords

uniform sampler2D velocityField;
// simulation domain * dx = texture domain 
// texture domain * rdx = simulation domain
// halfrdx = 1/dx * 0.5 = 1/2dx
uniform vec2 dx; 

out float divergence;

void main() {
  // velocities of adjacent cells
  vec2 l = texture(velocityField, position_l).xy;
  vec2 r = texture(velocityField, position_r).xy;
  vec2 t = texture(velocityField, position_t).xy;
  vec2 b = texture(velocityField, position_b).xy;

  divergence = 0.5 / ((r.x - l.x) * dx.x + (t.y - b.y) * dx.y);
}
`;

const FSSolvePressure = `#version 300 es
precision highp float;

in vec2 position; // coordinates in texCoords
in vec2 position_l; // coordinates of left pixel in texCoords
in vec2 position_r; // coordinates of right pixel in texCoords
in vec2 position_t; // coordinates of top pixel in texCoords
in vec2 position_b; // coordinates of bottom pixel in texCoords

uniform sampler2D divergenceResult; // Solution matrix * field = result
uniform sampler2D pressureField; // R32F texture

out float pressure;

void main() {
  float c = texture(pressureField, position).x;
  float l = texture(pressureField, position_l).x;
  float r = texture(pressureField, position_r).x;
  float t = texture(pressureField, position_t).x;
  float b = texture(pressureField, position_b).x;
  float result = texture(divergenceResult, position).x;

  float alpha = -(c * c);
  float rBeta = 0.25;
  float pressure = (l + r + t + b + alpha * result) * rBeta;
}
`;

const FSGradientSubtract = `#version 300 es
precision highp float;

in vec2 position; // coordinates in texCoords
in vec2 position_l; // coordinates of left pixel in texCoords
in vec2 position_r; // coordinates of right pixel in texCoords
in vec2 position_t; // coordinates of top pixel in texCoords
in vec2 position_b; // coordinates of bottom pixel in texCoords

uniform sampler2D velocityField;
uniform sampler2D pressureField;
uniform float dx;

layout(location = 0) out vec2 velocity;

void main() {
  float l = texture(pressureField, position_l).x;
  float r = texture(pressureField, position_r).x;
  float t = texture(pressureField, position_t).x;
  float b = texture(pressureField, position_b).x;

  vec2 v = texture(velocityField, position).xy;
  velocity = v - 0.5 / dx * vec2(r - l, t - b);
}
`;

const FSSetBoundaries = `#version 300 es
precision highp float;

in vec2 texCoords; // position in texture coords
in vec2 v_normal; // normalised vector

uniform sampler2D velocityField;
uniform sampler2D pressureField;
uniform float px; // length of pixel in texture space

layout(location = 0) out vec2 velocity;
layout(location = 1) out float pressure;

void main() {
  vec2 v = texture(velocityField, texCoords + v_normal * px).xy;
  velocity = -v;

  float p = texture(pressureField, texCoords + v_normal * px).x;
  pressure = p;
}
`;

const FSDisplayTexture = `#version 300 es
precision highp float;

in vec2 position; // texture coords

uniform sampler2D velocityField;
uniform sampler2D pressureField;
uniform int mode;

out vec4 colour;

void main() {
  vec4 c = vec4(0, 0, 0, 1);
  switch(mode) {
    case 0:
      c.xy = texture(velocityField, position).xy;
      break;
    case 1: 
      c.x = texture(pressureField, position).x;
      break;
  }
  colour = c;
}
`;