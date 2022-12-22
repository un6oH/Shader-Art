const FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_image;
uniform bool u_updateCells;
uniform float u_deltaTimeSeconds;

// simulation parameters
uniform vec2 u_textureSize;

varying vec2 v_texCoord;

const float cellRadius = 10.0;
const float neighbourRadius = cellRadius * 3.0;

float b1 = 0.250; // death -> life interval lower
float b2 = 0.30; // death -> life interval upper
float d1 = 0.32; // life -> death interval lower
float d2 = 0.549; // life -> death interval upper
float transitionSmoothRadius = 0.028;
float lifeSmoothRadius = 0.147;

void main() {
  if (!u_updateCells) {
    gl_FragColor = texture2D(u_image, v_texCoord / u_textureSize);
    return;
  }

  // calculate cell life
  float cTotalLife = 0.0;
  float cTotalWeight = 0.0;
  for (float x = -cellRadius - 3.0; x <= cellRadius + 3.0; x += 1.0) {
    for (float y = -cellRadius - 3.0; y <= cellRadius + 3.0; y += 1.0) {
      vec2 pos = vec2(x, y);
      float weight = 1.0 - smoothstep(cellRadius - 2.0, cellRadius + 2.0, length(pos));
      vec2 texCoord = (v_texCoord + pos) / u_textureSize;
      float texValue = texture2D(u_image, texCoord).r;

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
      vec2 texCoord = (v_texCoord + pos) / u_textureSize;
      float texValue = texture2D(u_image, texCoord).r;

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
    float f = smoothstep(b1 - transitionSmoothRadius, b1 + transitionSmoothRadius, neighbourLife);
    float g = 1.0 - smoothstep(b2 - transitionSmoothRadius, b2 + transitionSmoothRadius, neighbourLife);
    newLife = f * g;
  } else if (0.5 - lifeSmoothRadius < cellLife && cellLife < 0.5 + lifeSmoothRadius) { // cell is between life and death
    float a = 1.0 - smoothstep(0.5 - lifeSmoothRadius, 0.5 + lifeSmoothRadius, cellLife);
    float b = 1.0 - a;
    float f = smoothstep(a*b1 + b*d1 - transitionSmoothRadius, a*b1 + b*d1 + transitionSmoothRadius, neighbourLife);
    float g = 1.0 - smoothstep(a*b2 + b*d2 - transitionSmoothRadius, a*b2 + b*d2 + transitionSmoothRadius, neighbourLife);
    newLife = f * g;
  } else { // cell is alive
    float f = smoothstep(d1 - transitionSmoothRadius, d1 + transitionSmoothRadius, neighbourLife);
    float g = 1.0 - smoothstep(d2 - transitionSmoothRadius, d2 + transitionSmoothRadius, neighbourLife);
    newLife = f * g;
  }

  float deltaLife = (newLife - cellLife) * u_deltaTimeSeconds;
  float currentValue = texture2D(u_image, v_texCoord / u_textureSize).r;
  float newValue = clamp(currentValue + deltaLife, 0.0, 1.0);
  gl_FragColor = vec4(vec3(newValue), 1.0);
}
`