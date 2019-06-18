
Math.lineLen = (a, b) => Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2))

Math.cosinByPoints = (A, B, C) => {

  var a = Math.lineLen(B, C);
  var b = Math.lineLen(A, C);
  var c = Math.lineLen(A, B);

  var cos = (Math.pow(a, 2) + Math.pow(c, 2) - Math.pow(b, 2)) / (2*a*c)
  var sin = Math.sqrt(1 - Math.pow(cos, 2))
  
  return { sin, cos }

}
