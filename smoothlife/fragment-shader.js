const UPDATE_FS = `#version 300 es
precision mediump float;

in vec2 texCoord; // (0, 0) to (1, 1)

uniform sampler2D image;
uniform vec2 textureDimensions;
uniform float deltaTime;
uniform float cellRadius;
uniform float neighbourRadius;
uniform float birthLower;
uniform float birthUpper;
uniform float deathLower;
uniform float deathUpper;
uniform float transitionSmoothRadius;
uniform float lifeSmoothRadius;
uniform float deltaMultiplier;

out vec4 colour;

void main() {
  vec2 onePixel = vec2(1, 1) / textureDimensions;

  // calculate cell life
  float cTotalLife = 0.0;
  float cTotalWeight = 0.0;
  for (float x = -cellRadius - 3.0; x <= cellRadius + 3.0; x += 1.0) {
    for (float y = -cellRadius - 3.0; y <= cellRadius + 3.0; y += 1.0) {
      vec2 pos = vec2(x, y);
      float weight = 1.0 - smoothstep(cellRadius - 2.0, cellRadius + 2.0, length(pos));
      float texValue = texture(image, texCoord + onePixel * pos).r;

      cTotalLife += texValue * weight;
      cTotalWeight += weight;
    }
  }
  float cellLife = cTotalLife / cTotalWeight;

  // calculate neighbour life
  float nTotalLife = 0.0;
  float nTotalWeight = 0.0;
  for (float x = -neighbourRadius - 3.0; x <= neighbourRadius + 3.0; x += 1.0) {
    for (float y = -neighbourRadius - 3.0; y <= neighbourRadius + 3.0; y += 1.0) {
      vec2 pos = vec2(x, y);
      float weight = 1.0 - smoothstep(neighbourRadius - 2.0, neighbourRadius + 2.0, length(pos));
      float texValue = texture(image, texCoord + onePixel * pos).r;

      nTotalLife += texValue * weight;
      nTotalWeight += weight;
    }
  }
  nTotalLife -= cTotalLife;
  nTotalWeight -= cTotalWeight;
  float neighbourLife = nTotalLife / nTotalWeight;

  bool alive = cellLife >= 0.5;

  float newLife;
  if (cellLife < 0.5 - lifeSmoothRadius) { // cell is dead
    float f = smoothstep(birthLower - transitionSmoothRadius, birthLower + transitionSmoothRadius, neighbourLife);
    float g = 1.0 - smoothstep(birthUpper - transitionSmoothRadius, birthUpper + transitionSmoothRadius, neighbourLife);
    newLife = f * g;
  } else if (0.5 - lifeSmoothRadius < cellLife && cellLife < 0.5 + lifeSmoothRadius) { // cell is between life and death
    float a = 1.0 - smoothstep(0.5 - lifeSmoothRadius, 0.5 + lifeSmoothRadius, cellLife);
    float b = 1.0 - a;
    float f = smoothstep(a*birthLower + b*deathLower - transitionSmoothRadius, a*birthLower + b*deathLower + transitionSmoothRadius, neighbourLife);
    float g = 1.0 - smoothstep(a*birthUpper + b*deathUpper - transitionSmoothRadius, a*birthUpper + b*deathUpper + transitionSmoothRadius, neighbourLife);
    newLife = f * g;
  } else { // cell is alive
    float f = smoothstep(deathLower - transitionSmoothRadius, deathLower + transitionSmoothRadius, neighbourLife);
    float g = 1.0 - smoothstep(deathUpper - transitionSmoothRadius, deathUpper + transitionSmoothRadius, neighbourLife);
    newLife = f * g;
  }

  float deltaLife = (newLife - cellLife) * deltaTime * deltaMultiplier;
  float currentValue = texture(image, texCoord).r;
  float newValue = clamp(currentValue + deltaLife, 0.0, 1.0);
  colour = vec4(vec3(newValue), 1.0);
}
`;

const DISPLAY_FS = `#version 300 es
precision mediump float;

in vec2 texCoord;

uniform sampler2D image;

out vec4 colour;

void main() {
  colour = texture(image, texCoord);
}
`

