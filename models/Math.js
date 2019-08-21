
Math.lineLen = (a, b) => Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2))

Math.cosinByPoints = (A, B, C) => {

  var a = Math.lineLen(B, C);
  var b = Math.lineLen(A, C);
  var c = Math.lineLen(A, B);

  var cos = (Math.pow(a, 2) + Math.pow(c, 2) - Math.pow(b, 2)) / (2*a*c)
  var sin = Math.sqrt(1 - Math.pow(cos, 2))
  
  return { sin, cos }

}

Math.calcRealSize = (SIZE, ROTATION, VX = 'x', VY = 'y') => {

  var x = SIZE[VX]*Math.cos(ROTATION)+SIZE[VY]*Math.sin(ROTATION)
  var y = SIZE[VX]*Math.sin(ROTATION)+SIZE[VY]*Math.cos(ROTATION)

  SIZE[VX] = x
  SIZE[VY] = y

  return SIZE

}

Math.calcRealSizeCosSin = (SIZE, COS, SIN, VX = 'x', VY = 'y') => {

  SIZE[VX] = SIZE[VX]*COS+SIZE[VY]*SIN
  SIZE[VY] = SIZE[VY]*COS+SIZE[VX]*SIN

  return SIZE

}
