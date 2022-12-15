const Mat3 = {
  //
  // matrix formulas
  //
  identity: () => {
    return [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    ];
  },

  projection: (width, height) => {
    return [
      2 / width, 0, 0,
      0, -2 / height, 0,
      -1, 1, 1
    ];
  },

  translation: (tx, ty) => {
    return [
      1, 0, 0,
      0, 1, 0,
      tx, ty, 1
    ];
  },

  rotation: (theta) => {
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    return [
      c, -s, 0, 
      s, c, 0, 
      0, 0, 1
    ];
  },

  scaling: (sx, sy) => {
    return [
      sx, 0, 0,
      0, sy, 0,
      0, 0, 1
    ];
  },

  //
  // operations
  //
  multiply: (A, B) => {
    let a00 = A[0];
    let a01 = A[1];
    let a02 = A[2];
    let a10 = A[3];
    let a11 = A[4];
    let a12 = A[5];
    let a20 = A[6];
    let a21 = A[7];
    let a22 = A[8];
    let b00 = B[0];
    let b01 = B[1];
    let b02 = B[2];
    let b10 = B[3];
    let b11 = B[4];
    let b12 = B[5];
    let b20 = B[6];
    let b21 = B[7];
    let b22 = B[8];

    return [
      a00*b00 + a01*b10 + a02*b20, 
      a00*b01 + a01*b11 + a02*b21, 
      a00*b02 + a01*b12 + a02*b22,
      a10*b00 + a11*b10 + a12*b20,
      a10*b01 + a11*b11 + a12*b21,
      a10*b02 + a11*b12 + a12*b22,
      a20*b00 + a21*b10 + a22*b20,
      a20*b01 + a21*b11 + a22*b21,
      a20*b02 + a21*b12 + a22*b22,
    ];
  },
  
  translate: (m, tx, ty) => {
    return Mat3.multiply(Mat3.translation(tx, ty), m);
  },

  rotate: (m, angle) => {
    return Mat3.multiply(Mat3.rotation(angle), m);
  },

  scale: (m, sx, sy) => {
    return Mat3.multiply(Mat3.scaling(sx, sy), m);
  }
}

const Mat4 = {
  multiply: (A, B) => {
    let a11 = A[0];
    let a12 = A[1];
    let a13 = A[2];
    let a14 = A[3];
    let a21 = A[4];
    let a22 = A[5];
    let a23 = A[6];
    let a24 = A[7];
    let a31 = A[8];
    let a32 = A[9];
    let a33 = A[10];
    let a34 = A[11];
    let a41 = A[12];
    let a42 = A[13];
    let a43 = A[14];
    let a44 = A[15];

    let b11 = B[0];
    let b12 = B[1];
    let b13 = B[2];
    let b14 = B[3];
    let b21 = B[4];
    let b22 = B[5];
    let b23 = B[6];
    let b24 = B[7];
    let b31 = B[8];
    let b32 = B[9];
    let b33 = B[10];
    let b34 = B[11];
    let b41 = B[12];
    let b42 = B[13];
    let b43 = B[14];
    let b44 = B[15];

    return [
      a11*b11 + a12*b21 + a13*b31 + a14*b41,
      a11*b12 + a12*b22 + a13*b32 + a14*b42,
      a11*b13 + a12*b23 + a13*b33 + a14*b43,
      a11*b14 + a12*b24 + a13*b34 + a14*b44,
      a21*b11 + a22*b21 + a23*b31 + a24*b41,
      a21*b12 + a22*b22 + a23*b32 + a24*b42,
      a21*b13 + a22*b23 + a23*b33 + a24*b43,
      a21*b14 + a22*b24 + a23*b34 + a24*b44,
      a31*b11 + a32*b21 + a33*b31 + a34*b41,
      a31*b12 + a32*b22 + a33*b32 + a34*b42,
      a31*b13 + a32*b23 + a33*b33 + a34*b43,
      a31*b14 + a32*b24 + a33*b34 + a34*b44,
      a41*b11 + a42*b21 + a43*b31 + a44*b41,
      a41*b12 + a42*b22 + a43*b32 + a44*b42,
      a41*b13 + a42*b23 + a43*b33 + a44*b43,
      a41*b14 + a42*b24 + a43*b34 + a44*b44,
    ];
  },

  inverse: (M) => {
    // console.log("Mat4.inverse()");

    let A = [];
    let I = Mat4.identity();
    // create augmented matrix
    for (let i = 0; i < 4; ++i) {
      for (let j = 0; j < 4; ++j) {
        A[i*8 + j] = M[i*4 + j];
        A[i*8 + j + 4] = I[i*4 + j];
      }
    }
    // console.log(Mat4.toString(A, 8, 4));

    // convert to row echelon form;
    for (let n = 0; n < 4; ++n) {
      // normalise rows with the leading value
      let leading = A[n*8 + n];
      if (leading != 1) {
        for (let j = n; j < 8; ++j) {
          A[n*8 + j] /= leading;
        }
        // console.log(Mat4.toString(A, 8, 4));
      }

      // subtract ith row from succeeding rows
      for (let i = n + 1; i < 4; ++i) {
        let factor = A[i*8 + n];
        for (let m = n; m < 8; ++m) {
          A[i*8 + m] -= A[n*8 + m] * factor;
        }
        // if (factor != 0) { console.log(Mat4.toString(A, 8, 4)); }
      }
    }

    // convert to reduced row echelon form
    for (let n = 3; n > 0; --n) {
      // subtract ith row multiplied by ith element of each preceding rows
      for (let i = n - 1; i >= 0; --i) {
        let factor = A[i*8 + n];
        for (let j = n; j < 8; ++j) {
          A[i*8 + j] -= A[n*8 + j] * factor;
        }
        // if (factor != 0) { console.log(Mat4.toString(A, 8, 4)); }
      }
    }

    // output right side of augmented matrix
    let inv = [];
    for (let n = 0; n < 4; ++n) {
      for (let m = 0; m < 4; ++m) { 
        inv[n*4 + m] = A[n*8 + m + 4];
      }
    }
    // console.log(Mat4.toString(inv, 4, 4));
    return inv;
  }, 

  vectorMultiply: (M, v) => {
    let 
      m11 = M[0], 
      m12 = M[1], 
      m13 = M[2], 
      m14 = M[3], 
      m21 = M[4], 
      m22 = M[5], 
      m23 = M[6], 
      m24 = M[7], 
      m31 = M[8], 
      m32 = M[9], 
      m33 = M[10], 
      m34 = M[11], 
      m41 = M[12], 
      m42 = M[13], 
      m43 = M[14], 
      m44 = M[15];
      
    let 
      v1 = v[0],
      v2 = v[1],
      v3 = v[2],
      v4 = v[3];
    
    return [
      m11*v1 + m21*v2 + m31*v3 + m41*v4, 
      m12*v1 + m22*v2 + m32*v3 + m42*v4, 
      m13*v1 + m23*v2 + m33*v3 + m43*v4, 
      m14*v1 + m24*v2 + m34*v3 + m44*v4, 
    ];
  },

  translation: (tx, ty, tz) => {
    return [
      1, 0, 0, 0, 
      0, 1, 0, 0, 
      0, 0, 1, 0,
      tx, ty, tz, 1
    ];
  },

  xRotation: (theta) => {
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    return [
      1, 0, 0, 0, 
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1
    ]
  },

  yRotation: (theta) => {
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    return [
      c, 0, -s, 0, 
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1
    ]
  },

  zRotation: (theta) => {
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    return [
      c, s, 0, 0, 
      -s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]
  },

  scaling: (sx, sy, sz) => {
    return [
      sx, 0, 0, 0, 
      0, sy, 0, 0, 
      0, 0, sz, 0, 
      0, 0, 0, 1
    ];
  },

  lookAt: (cameraPosition, target, up) => {
    // console.log("Mat4.lookAt()");

    let zAxis = Vec3.normalise(Vec3.sub(cameraPosition, target));
    let xAxis = Vec3.normalise(Vec3.cross(up, zAxis));
    let yAxis = Vec3.normalise(Vec3.cross(zAxis, xAxis));
    // console.log(zAxis + "; " + xAxis + "; " + yAxis);

    return [
      xAxis[0], xAxis[1], xAxis[2], 0, 
      yAxis[0], yAxis[1], yAxis[2], 0, 
      zAxis[0], zAxis[1], zAxis[2], 0, 
      cameraPosition[0], cameraPosition[1], cameraPosition[2], 1
    ];
  },

  identity: () => {
    return [
      1, 0, 0, 0, 
      0, 1, 0, 0, 
      0, 0, 1, 0, 
      0, 0, 0, 1
    ];
  },

  orthographic: (left, right, bottom, top, near, far) => {
    return [
      2 / (right - left), 0, 0, 0,
      0, 2 / (top - bottom), 0, 0,
      0, 0, 2 / (near - far), 0,
 
      (left + right) / (left - right),
      (bottom + top) / (bottom - top),
      (near + far) / (near - far),
      1,
    ];
  },

  perspective: (fov, aspect, near, far) => {
    let f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
    let rangeInv = 1.0 / (near - far);

    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0, 
      0, 0, (near + far) * rangeInv, -1, 
      0, 0, near * far * rangeInv * 2, 0
    ];
  },

  translate: (m, tx, ty, tz) => Mat4.multiply(Mat4.translation(tx, ty, tz), m),

  xRotate: (m, angle) => Mat4.multiply(Mat4.xRotation(angle), m),

  yRotate: (m, angle) => Mat4.multiply(Mat4.yRotation(angle), m),

  zRotate: (m, angle) => Mat4.multiply(Mat4.zRotation(angle), m),

  scale: (m, sx, sy, sz) => Mat4.multiply(Mat4.scaling(sx, sy, sz), m),

  toString: (matrix, columns, rows) => {
    let out = "";
    for (let n = 0; n < rows; ++n) {
      for (let m = 0; m < columns; ++m) {
        out += Math.round(matrix[n*columns + m] * 1000) / 1000 + " ";
      }
      if (n != columns - 1) {
        out += "\n";
      }
    }
    return out;
  }
}