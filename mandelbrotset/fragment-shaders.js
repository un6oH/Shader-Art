const FS = 
`#version 300 es

precision highp float;

in vec2 relativePosition; // position relative to centre

uniform vec4 centre; // coords of centre
uniform float prec; // precision of gross component
uniform int maxIterations;

out vec4 colour;

float p;

vec2 complexMult(vec4 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 rfComponents(float a) { // deconstruction
  float f = mod(a, p);
  float g = a - f;
  // float q = a / p;
  // float g = p * floor(q); // gross component
  // float f = (a - g) / p; // fine component
  return vec2(g, f);
}

vec2 rfSum(vec2 m, vec2 n) { // recursive float add
  vec2 a, b;
  if (abs(m.x) > abs(n.x)) {
    a = m;
    b = n;
  } else {
    a = n;
    b = m;
  }
  vec2 fSum = rfComponents(a.y + b.y); // sum of fine components
  float g = a.x + b.x + fSum.x; // gross component
  return vec2(g, fSum.y);
}

vec2 rfProduct(vec2 a, vec2 b) { // recursive float mult
  vec2 t1 = rfComponents(a.x * b.x); // 1st term
  vec2 t2 = rfComponents(a.x * b.y); // 2nd term
  vec2 t3 = rfComponents(a.y * b.x);
  vec2 t4 = rfComponents(a.y * b.y);

  vec2 fSum = rfComponents(t1.y + t2.y + t3.y + t4.y);
  float gSum = t1.x + t2.x + t3.x + t4.x;
  return vec2(gSum + fSum.x, fSum.y);
}

vec4 rfvAdd(vec4 a, vec4 b) {
  return vec4(rfSum(a.xy, b.xy), rfSum(a.zw, b.zw));
}

vec4 rfvComplexProduct(vec4 a, vec4 b) { // z = z_rg + z_rf + (z_ig + z_if)i
  vec2 ar = a.xy;
  vec2 ai = a.zw;
  vec2 br = b.xy;
  vec2 bi = b.zw;

  vec2 real = rfSum( rfProduct(ar, br), -rfProduct(ai, bi) );
  vec2 imaginary = rfSum( rfProduct(ar, bi), rfProduct(ai, br) );
  return vec4(real, imaginary);
}

void main() {
  p = prec;

  vec4 r = vec4(rfComponents(relativePosition.x), rfComponents(relativePosition.y)); // components of relative position
  vec4 C = rfvAdd(centre, r);
  vec4 z = C;
  int i = 0;
  while (rfSum(rfProduct(z.xy, z.xy), rfProduct(z.zw, z.zw)).x < 4.0 && i < maxIterations) {
    z = rfvComplexProduct(z, z);
    z = rfvAdd(z, C);
    i++;
  }
  colour = vec4(vec3(float(i) / float(maxIterations)), 1);
}
`;

const TEXTURE_FS = `#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D tex;

out vec4 colour;

void main() {
  colour = texture(tex, texCoord);
}
`