
module.exports = {
  happy: {
    raw: `a,b,c
1,B,true
2,BB,false
`,
    out: [{a:'1',b:'B',c:'true'},{a:'2',b:'BB',c:'false'}]
  },

  quote: {
    raw: `a,b,c
"1","B","true"
"2","B""B","false"
`,
    out: [{a:'1',b:'B',c:'true'},{a:'2',b:'B"B',c:'false'}]
  },

  
  notrim: {
    raw: `a,b,c
1 , 2 , 3
 11 ,  22   , 33 
4\t,\t5\t,\t6
\t44\t,\t\t55\t\t\t,\t66\t
`,
    out: [
      {
        a: '1 ',
        b: ' 2 ',
        c: ' 3',
      },
      {
        a: ' 11 ',
        b: '  22   ',
        c: ' 33 ',
      },
      {
        a: '4\t',
        b: '\t5\t',
        c: '\t6',
      },
      {
        a: '\t44\t',
        b: '\t\t55\t\t\t',
        c: '\t66\t',
      },
    ]
  },

  trim: {
    opt: { trim: true },
    rawref: 'notrim',
    out: [
      {
        a: '1',
        b: '2',
        c: '3',
      },
      {
        a: '11',
        b: '22',
        c: '33',
      },
      {
        a: '4',
        b: '5',
        c: '6',
      },
      {
        a: '44',
        b: '55',
        c: '66',
      },
    ]
  },


  // Copyright (c) 2015 Matthew Holt
  // See https://github.com/mholt/PapaParse

  "papa-One row": {
    opt: { header: false, object: false },
    raw: 'A,b,c',
    out: [['A', 'b', 'c']],
  },
  "papa-Two rows": {
    opt: { header: false, object: false },
    raw: 'A,b,c\nd,E,f',
    out: [['A', 'b', 'c'], ['d', 'E', 'f']],
  },
  "papa-Three rows": {
    opt: { header: false, object: false },
    raw: 'A,b,c\nd,E,f\nG,h,i',
    out: [['A', 'b', 'c'], ['d', 'E', 'f'], ['G', 'h', 'i']],
  },
  "papa-Whitespace at edges of unquoted field": {
    opt: { header: false, object: false },
    raw: 'a,	b ,c',
		notes: "Extra whitespace should graciously be preserved",
    out: [['a', '	b ', 'c']],
  },
  "papa-Quoted field": {
    opt: { header: false, object: false },
    raw: 'A,"B",C',
    out: [['A', 'B', 'C']],
  },
  "papa-Quoted field with extra whitespace on edges": {
    opt: { header: false, object: false },
    raw: 'A," B  ",C',
    out: [['A', ' B  ', 'C']],
  },
  "papa-Quoted field with delimiter": {
    opt: { header: false, object: false },
    raw: 'A,"B,B",C',
    out: [['A', 'B,B', 'C']],
  },
  "papa-Quoted field with line break": {
    opt: { header: false, object: false },
    raw: 'A,"B\nB",C',
    out: [['A', 'B\nB', 'C']],
  },
  "papa-Quoted fields with line breaks": {
    opt: { header: false, object: false },
    raw: 'A,"B\nB","C\nC\nC"',
    out: [['A', 'B\nB', 'C\nC\nC']],
  },
  "papa-Quoted fields at end of row with delimiter and line break": {
    opt: { header: false, object: false },
    raw: 'a,b,"c,c\nc"\nd,e,f',
    out: [['a', 'b', 'c,c\nc'], ['d', 'e', 'f']],
  },
  "papa-Quoted field with escaped quotes": {
    opt: { header: false, object: false },
    raw: 'A,"B""B""B",C',
    out: [['A', 'B"B"B', 'C']],
  },
  "papa-Quoted field with escaped quotes at boundaries": {
    opt: { header: false, object: false },
    raw: 'A,"""B""",C',
    out: [['A', '"B"', 'C']],
  },
  "papa-Unquoted field with quotes at end of field": {
    opt: { header: false, object: false },
    raw: 'A,B",C',
    out: [['A', 'B"', 'C']],
  },
  "papa-Quoted field with quotes around delimiter": {
    opt: { header: false, object: false },
    raw: 'A,""",""",C',
    out: [['A', '","', 'C']],
  },
  "papa-Quoted field with quotes on right side of delimiter": {
    opt: { header: false, object: false },
    raw: 'A,",""",C',
    out: [['A', ',"', 'C']],
  },
  "papa-Quoted field with quotes on left side of delimiter": {
    opt: { header: false, object: false },
    raw: 'A,""",",C',
    out: [['A', '",', 'C']],
  },

  "papa-Quoted field with 5 quotes in a row and a delimiter in there: too": {
    opt: { header: false, object: false },
    raw: '"1","cnonce="""",nc=""""","2"',
    out: [['1', 'cnonce="",nc=""', '2']],
  },
  "papa-Quoted field with whitespace around quotes": {
    opt: { header: false, object: false },
    raw: 'A, "B" ,C',
    out: [['A', ' "B" ', 'C']],
  },
  "papa-Misplaced quotes in data: not as opening quotes": {
    opt: { header: false, object: false },
    raw: 'A,B "B",C',
    out: [['A', 'B "B"', 'C']],
  },
  "papa-Quoted field has no closing quote": {
    opt: { header: false, object: false },
    raw: 'a,"b,c\nd,e,f',
    err: 'unterminated_string',
  },
  "papa-Quoted field has invalid trailing quote after delimiter with a valid closer": {
    opt: { header: false, object: false },
    raw: '"a,"b,c"\nd,e,f',
    err: 'unexpected',
  },
  "papa-Quoted field has invalid trailing quote after delimiter": {
    opt: { header: false, object: false },
    raw: 'a,"b,"c\nd,e,f',
    err: 'unexpected',
  },
  "papa-Quoted field has invalid trailing quote before delimiter": {
    opt: { header: false, object: false },
    raw: 'a,"b"c,d\ne,f,g',
    err: 'unexpected',
  },

  "papa-Quoted field has invalid trailing quote after new line": {
    opt: { header: false, object: false },
    raw: 'a,"b,c\nd"e,f,g',
    err: 'unexpected',
  },
  
  "papa-Quoted field has valid trailing quote via delimiter": {
    opt: { header: false, object: false },
    raw: 'a,"b",c\nd,e,f',
		notes: "Trailing quote is valid due to trailing delimiter",
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
  },
  "papa-Quoted field has valid trailing quote via \\n": {
    opt: { header: false, object: false },
    raw: 'a,b,"c"\nd,e,f',
		notes: "Trailing quote is valid due to trailing new line delimiter",
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
  },
  "papa-Quoted field has valid trailing quote via EOF": {
    opt: { header: false, object: false },
    raw: 'a,b,c\nd,e,"f"',
		notes: "Trailing quote is valid due to EOF",
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
  },
  "papa-Quoted field contains delimiters and \\n with valid trailing quote": {
    opt: { header: false, object: false },
    raw: 'a,"b,c\nd,e,f"',
		notes: "Trailing quote is valid due to trailing delimiter",
    out: [['a', 'b,c\nd,e,f']],
  },
  "papa-Line starts with quoted field": {
    opt: { header: false, object: false },
    raw: 'a,b,c\n"d",e,f',
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
  },
  "papa-Line starts with unquoted empty field": {
    opt: { header: false, object: false },
    raw: ',b,c\n"d",e,f',
    out: [['', 'b', 'c'], ['d', 'e', 'f']],
  },
  "papa-Line ends with quoted field": {
    opt: { header: false, object: false },
    raw: 'a,b,c\nd,e,f\n"g","h","i"\n"j","k","l"',
    out: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i'], ['j', 'k', 'l']],
  },
  "papa-Line ends with quoted field: first field of next line is empty, \\n": {
    opt: { header: false, object: false },
    raw: 'a,b,c\n,e,f\n,"h","i"\n,"k","l"',
    out: [['a', 'b', 'c'], ['', 'e', 'f'], ['', 'h', 'i'], ['', 'k', 'l']],
  },
  "papa-Quoted field at end of row (but not at EOF) has quotes": {
    opt: { header: false, object: false },
    raw: 'a,b,"c""c"""\nd,e,f',
    out: [['a', 'b', 'c"c"'], ['d', 'e', 'f']],
  },
  "papa-Empty quoted field at EOF is empty": {
    opt: { header: false, object: false },
    raw: 'a,b,""\na,b,""',
    out: [['a', 'b', ''], ['a', 'b', '']],
  },
  "papa-Multiple consecutive empty fields": {
    opt: { header: false, object: false },
    raw: 'a,b,,,c,d\n,,e,,,f',
    out: [['a', 'b', '', '', 'c', 'd'], ['', '', 'e', '', '', 'f']],
  },
  "papa-Empty input string": {
    opt: { header: false, object: false },
    raw: '',
    out: [],
  },
  "papa-Input is just the delimiter (2 empty fields)": {
    opt: { header: false, object: false },
    raw: ',',
    out: [['', '']],
  },
  "papa-Input is just empty fields": {
    opt: { header: false, object: false },
    raw: ',,\n,,,',
    out: [['', '', ''], ['', '', '', '']],
  },
  "papa-Input is just a string (a single field)": {
    opt: { header: false, object: false },
    raw: 'Abc def',
    out: [['Abc def']],
  },
  "papa-Commented line at beginning": {
    opt: { header: false, object: false, comment: true },
    raw: '# Comment!\na,b,c',
    out: [['a', 'b', 'c']],
  },
  "papa-Commented line in middle": {
    opt: { header: false, object: false, comment: true },
    raw: 'a,b,c\n# Comment\nd,e,f',
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
  },
  "papa-Commented line at end": {
    opt: { header: false, object: false, comment: true },
    raw: 'a,true,false\n# Comment',
    out: [['a', 'true', 'false']],
  },
  "papa-Two comment lines consecutively": {
    opt: { header: false, object: false, comment: true },
    raw: 'a,b,c\n#comment1\n#comment2\nd,e,f',
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
  },
  "papa-Two comment lines consecutively at end of file": {
    opt: { header: false, object: false, comment: true },
    raw: 'a,b,c\n#comment1\n#comment2',
    out: [['a', 'b', 'c']],
  },
  "papa-Three comment lines consecutively at beginning of file": {
    opt: { header: false, object: false, comment: true },
    raw: '#comment1\n#comment2\n#comment3\na,b,c',
    out: [['a', 'b', 'c']],
  },
  "papa-Entire file is comment lines": {
    opt: { header: false, object: false, comment: true },
    raw: '#comment1\n#comment2\n#comment3',
    out: [],
  },
  // "papa-Comment with non-default character": {
  //   opt: { header: false, object: false },
  //   raw: 'a,b,c\n!Comment goes here\nd,e,f',
  //   config: { comments: '!' },
  //   out: [['a', 'b', 'c'], ['d', 'e', 'f']],
  // },
  "papa-Bad comments value specified": {
    opt: { header: false, object: false },
    raw: 'a,b,c\n5comment\nd,e,f',
    out: [['a', 'b', 'c'], ['5comment'], ['d', 'e', 'f']],
  },
  // "papa-Multi-character comment string": {
  //   opt: { header: false, object: false },
  //   raw: 'a,b,c\n=N(Comment)\nd,e,f',
  //       	config: { comments: "=N(" },
  //   out: [['a', 'b', 'c'], ['d', 'e', 'f']],
  // },
  // "papa-Input with only a commented line": {
  //   opt: { header: false, object: false, comment: true },
  //   raw: '#commented line',
  //   out: [],
  // },
  // "papa-Input with only a commented line and blank line after": {
  //   opt: { header: false, object: false, comment: true },
  //   raw: '#commented line\n',
  //   out: [['']],
  // },
  "papa-Input with only a commented line: without comments enabled": {
    opt: { header: false, object: false },
    raw: '#commented line',
    out: [['#commented line']],
  },
  "papa-Input without comments with line starting with whitespace": {
    opt: { header: false, object: false },
    raw: 'a\n b\nc',
    out: [['a'], [' b'], ['c']],
  },
  "papa-Multiple rows: one column (no delimiter found)": {
    opt: { header: false, object: false },
    raw: 'a\nb\nc\nd\ne',
    out: [['a'], ['b'], ['c'], ['d'], ['e']],
  },
  // "papa-One column input with empty fields": {
  //   opt: { header: false, object: false },
  //   raw: 'a\nb\n\n\nc\nd\ne\n',
  //   out: [['a'], ['b'], [''], [''], ['c'], ['d'], ['e'], ['']],
  // },
  "papa-Fast mode: basic": {
    opt: { header: false, object: false },
    raw: 'a,b,c\nd,e,f',
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
  },
  "papa-Fast mode with comments": {
    opt: { header: false, object: false, comment: true },
    raw: '// Commented line\na,b,c',
    out: [['a', 'b', 'c']],
  },
  // "papa-Fast mode with preview": {
  //   opt: { header: false, object: false },
  //   raw: 'a,b,c\nd,e,f\nh,j,i\n',
  //   out: [['a', 'b', 'c'], ['d', 'e', 'f']],
  // },
  // "papa-Fast mode with blank line at end": {
  //   opt: { header: false, object: false },
  //   raw: 'a,b,c\n',
  //   out: [['a', 'b', 'c'], ['']],
  // }


  "papa-Two rows: just \\r": {
    opt: { header: false, object: false },
    raw: 'A,b,c\rd,E,f',
    out: [['A', 'b', 'c'], ['d', 'E', 'f']],
  },

  "papa-Two rows: \\r\\n": {
    opt: { header: false, object: false },
    raw: 'A,b,c\r\nd,E,f',
    out: [['A', 'b', 'c'], ['d', 'E', 'f']],
  },
  "papa-Quoted field with \\r\\n": {
    opt: { header: false, object: false },
    raw: 'A,"B\r\nB",C',
    out: [['A', 'B\r\nB', 'C']],
  },
  "papa-Quoted field with \\r": {
    opt: { header: false, object: false },
    raw: 'A,"B\rB",C',
    out: [['A', 'B\rB', 'C']],
  },
  "papa-Quoted field with \\n": {
    opt: { header: false, object: false },
    raw: 'A,"B\nB",C',
    out: [['A', 'B\nB', 'C']],
  },

  /*
  "papa-Quoted fields with spaces between closing quote and next delimiter": {
    opt: { header: false, object: false, trim: true },
    raw: 'A,"B" ,C,D\r\nE,F,"G"  ,H',
    out: [['A', 'B', 'C','D'],['E', 'F', 'G','H']],
  },
  "papa-Quoted fields with spaces between closing quote and next new line": {
    opt: { header: false, object: false, trim: true },
    raw: 'A,B,C,"D" \r\nE,F,G,"H"  \r\nQ,W,E,R',
    out: [['A', 'B', 'C','D'],['E', 'F', 'G','H'],['Q', 'W', 'E','R']],
  },
  "papa-Quoted fields with spaces after closing quote": {
    opt: { header: false, object: false },
    raw: 'A,"B" ,C,"D" \r\nE,F,"G"  ,"H"  \r\nQ,W,"E" ,R',
    out: [['A', 'B', 'C','D'],['E', 'F', 'G','H'],['Q', 'W', 'E','R']],
},
"papa-Misplaced quotes in data twice: not as opening quotes": {
    opt: { header: false, object: false },
    raw: 'A,B",C\nD,E",F',
    out: [['A', 'B"', 'C'], ['D', 'E"', 'F']],
  },
  "papa-Mixed slash n and slash r should choose first as precident": {
    opt: { header: false, object: false },
    raw: 'a,b,c\nd,e,f\rg,h,i\n',
    out: [['a', 'b', 'c'], ['d', 'e', 'f\rg', 'h', 'i'], ['']],
  },
  "papa-Header row with one row of data": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\na,b,c',
		config: { header: true },
    out: [{"A": "a", "B": "b", "C": "c"}],
  },
  "papa-Header row only": {
    opt: { header: false, object: false },
    raw: 'A,B,C',
		config: { header: true },
    out: [],
  },
/*  
  "papa-Row with too few fields": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\na,b',
		config: { header: true },
    out: [{"A": "a", "B": "b"}],
			errors: [{
				"type": "FieldMismatch",
				"code": "TooFewFields",
				"message": "Too few fields: expected 3 fields but parsed 2",
				"row": 0
			}]
		}
	},
  "papa-Row with too many fields": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\na,b,c,d,e\r\nf,g,h',
		config: { header: true },
    out: [{"A": "a", "B": "b", "C": "c", "__parsed_extra": ["d", "e"]}, {"A": "f", "B": "g", "C": "h"}],
			errors: [{
				"type": "FieldMismatch",
				"code": "TooManyFields",
				"message": "Too many fields: expected 3 fields but parsed 5",
				"row": 0
			}]
		}
	},
  "papa-Row with enough fields but blank field in the begining": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\n,b1,c1\r\na2,b2,c2',
    out: [["A", "B", "C"], ['', 'b1', 'c1'], ['a2', 'b2', 'c2']],
  },
  "papa-Row with enough fields but blank field in the begining using headers": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\n,b1,c1\r\n,b2,c2',
		config: { header: true },
    out: [{"A": "", "B": "b1", "C": "c1"}, {"A": "", "B": "b2", "C": "c2"}],
  },
  "papa-Row with enough fields but blank field at end": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\na,b,',
		config: { header: true },
    out: [{"A": "a", "B": "b", "C": ""}],
  },
  "papa-Header rows are transformed when transformHeader function is provided": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\na,b,c',
		config: { header: true, transformHeader: function(header) { return header.toLowerCase(); } },
    out: [{"a": "a", "b": "b", "c": "c"}],
  },
  "papa-transformHeader accepts and optional index attribute": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\na,b,c',
		config: { header: true, transformHeader: function(header, i) { return i % 2 ? header.toLowerCase() : header; } },
    out: [{"A": "a", "b": "b", "C": "c"}],
			errors: []
		}

    papa-}:
		config: {
			header: true,
			newline: '\r\n',
		},
    out: [
				{a: 'd', b: 'e', c: 'f'},
				{a: '', b: 'h', c: 'i'},
				{a: '', b: 'k', c: 'l'}
			],
},
    "papa-Tab delimiter": {
    opt: { header: false, object: false },
    raw: 'a\tb\tc\r\nd\te\tf',
		config: { delimiter: "\t" },
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
},
    "papa-Pipe delimiter": {
    opt: { header: false, object: false },
    raw: 'a|b|c\r\nd|e|f',
		config: { delimiter: "|" },
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
},
    "papa-ASCII 30 delimiter": {
    opt: { header: false, object: false },
    raw: 'a' + RECORD_SEP + 'b' + RECORD_SEP + 'c\r\nd' + RECORD_SEP + 'e' + RECORD_SEP + 'f',
		config: { delimiter: RECORD_SEP },
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
},
    "papa-ASCII 31 delimiter": {
    opt: { header: false, object: false },
    raw: 'a' + UNIT_SEP + 'b' + UNIT_SEP + 'c\r\nd' + UNIT_SEP + 'e' + UNIT_SEP + 'f',
		config: { delimiter: UNIT_SEP },
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
},
    "papa-Bad delimiter (\\n)": {
    opt: { header: false, object: false },
    raw: 'a,b,c',
		config: { delimiter: "\n" },
		notes: "Should silently default to comma",
    out: [['a', 'b', 'c']],
},
    "papa-Multi-character delimiter": {
    opt: { header: false, object: false },
    raw: 'a, b, c',
		config: { delimiter: ", " },
    out: [['a', 'b', 'c']],
},
    "papa-Multi-character delimiter (length 2) with quoted field": {
    opt: { header: false, object: false },
    raw: 'a, b, "c, e", d',
		config: { delimiter: ", " },
		notes: "The quotes must be immediately adjacent to the delimiter to indicate a quoted field",
    out: [['a', 'b', 'c, e', 'd']],
},
    "papa-Callback delimiter": {
    opt: { header: false, object: false },
    raw: 'a$ b$ c',
		config: { delimiter: function(input) { return input[1] + ' '; } },
    out: [['a', 'b', 'c']],
},
    "papa-Dynamic typing converts numeric literals and maintains precision": {
    opt: { header: false, object: false },
    raw: '1,2.2,1e3\r\n-4,-4.5,-4e-5\r\n-,5a,5-2\r\n16142028098527942586,9007199254740991,-9007199254740992',
		config: { dynamicTyping: true },
    out: [[1, 2.2, 1000], [-4, -4.5, -0.00004], ["-", "5a", "5-2"], ["16142028098527942586", 9007199254740991, "-9007199254740992"]],
},
    "papa-Dynamic typing converts boolean literals": {
    opt: { header: false, object: false },
    raw: 'true,false,T,F,TRUE,FALSE,True,False',
		config: { dynamicTyping: true },
    out: [[true, false, "T", "F", true, false, "True", "False"]],
},
    "papa-Dynamic typing doesn't convert other types": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\nundefined,null,[\r\nvar,float,if',
		config: { dynamicTyping: true },
    out: [["A", "B", "C"], ["undefined", "null", "["], ["var", "float", "if"]],
},
    "papa-Dynamic typing applies to specific columns": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\n1,2.2,1e3\r\n-4,-4.5,-4e-5',
		config: { header: true, dynamicTyping: { A: true, C: true } },
    out: [{"A": 1, "B": "2.2", "C": 1000}, {"A": -4, "B": "-4.5", "C": -0.00004}],
},
    "papa-Dynamic typing applies to specific columns by index": {
    opt: { header: false, object: false },
    raw: '1,2.2,1e3\r\n-4,-4.5,-4e-5\r\n-,5a,5-2',
		config: { dynamicTyping: { 1: true } },
    out: [["1", 2.2, "1e3"], ["-4", -4.5, "-4e-5"], ["-", "5a", "5-2"]],
},
    "papa-Dynamic typing can be applied to `__parsed_extra`": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\n1,2.2,1e3,5.5\r\n-4,-4.5,-4e-5',
		config: { header: true, dynamicTyping: { A: true, C: true, __parsed_extra: true } },
    out: [{"A": 1, "B": "2.2", "C": 1000, "__parsed_extra": [5.5]}, {"A": -4, "B": "-4.5", "C": -0.00004}],
			errors: [{
				"type": "FieldMismatch",
				"code": "TooManyFields",
				"message": "Too many fields: expected 3 fields but parsed 4",
				"row": 0
			}]
		}
	},
    "papa-Dynamic typing by indices can be determined by function": {
    opt: { header: false, object: false },
    raw: '001,002,003',
		config: { dynamicTyping: function(field) { return (field % 2) === 0; } },
    out: [[1, "002", 3]],
},
    "papa-Dynamic typing by headers can be determined by function": {
    opt: { header: false, object: false },
    raw: 'A_as_int,B,C_as_int\r\n001,002,003',
		config: { header: true, dynamicTyping: function(field) { return /_as_int$/.test(field); } },
    out: [{"A_as_int": 1, "B": "002", "C_as_int": 3}],
},
    "papa-Dynamic typing converts empty values into NULL": {
    opt: { header: false, object: false },
    raw: '1,2.2,1e3\r\n,NULL,\r\n-,5a,null',
		config: { dynamicTyping: true },
    out: [[1, 2.2, 1000], [null, "NULL", null], ["-", "5a", "null"]],
},
    "papa-Custom transform function is applied to values": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\nd,e,f',
		config: {
			transform: function(value) {
				return value.toLowerCase();
			}
		},
    out: [["a","b","c"], ["d","e","f"]],
},
    "papa-Custom transform accepts column number also": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\nd,e,f',
		config: {
			transform: function(value, column) {
				if (column % 2) {
					value = value.toLowerCase();
				}
				return value;
			}
		},
    out: [["A","b","C"], ["d","e","f"]],
},
    "papa-Custom transform accepts header name when using header": {
    opt: { header: false, object: false },
    raw: 'A,B,C\r\nd,e,f',
		config: {
			header: true,
			transform: function(value, name) {
				if (name === 'B') {
					value = value.toUpperCase();
				}
				return value;
			}
		},
    out: [{'A': "d", 'B': "E", 'C': "f"}],
},
    "papa-Dynamic typing converts ISO date strings to Dates": {
    opt: { header: false, object: false },
    raw: 'ISO date,long date\r\n2018-05-04T21:08:03.269Z,Fri May 04 2018 14:08:03 GMT-0700 (PDT)\r\n2018-05-08T15:20:22.642Z,Tue May 08 2018 08:20:22 GMT-0700 (PDT)',
		config: { dynamicTyping: true },
    out: [["ISO date", "long date"], [new Date("2018-05-04T21:08:03.269Z"), "Fri May 04 2018 14:08:03 GMT-0700 (PDT)"], [new Date("2018-05-08T15:20:22.642Z"), "Tue May 08 2018 08:20:22 GMT-0700 (PDT)"]],
},
    "papa-Dynamic typing skips ISO date strings ocurring in other strings": {
    opt: { header: false, object: false },
    raw: 'ISO date,String with ISO date\r\n2018-05-04T21:08:03.269Z,The date is 2018-05-04T21:08:03.269Z\r\n2018-05-08T15:20:22.642Z,The date is 2018-05-08T15:20:22.642Z',
		config: { dynamicTyping: true },
    out: [["ISO date", "String with ISO date"], [new Date("2018-05-04T21:08:03.269Z"), "The date is 2018-05-04T21:08:03.269Z"], [new Date("2018-05-08T15:20:22.642Z"), "The date is 2018-05-08T15:20:22.642Z"]],
},
    "papa-Blank line at beginning": {
    opt: { header: false, object: false },
    raw: '\r\na,b,c\r\nd,e,f',
		config: { newline: '\r\n' },
    out: [[''], ['a', 'b', 'c'], ['d', 'e', 'f']],
},
    "papa-Blank line in middle": {
    opt: { header: false, object: false },
    raw: 'a,b,c\r\n\r\nd,e,f',
		config: { newline: '\r\n' },
    out: [['a', 'b', 'c'], [''], ['d', 'e', 'f']],
},
    "papa-Blank lines at end": {
    opt: { header: false, object: false },
    raw: 'a,b,c\nd,e,f\n\n',
    out: [['a', 'b', 'c'], ['d', 'e', 'f'], [''], ['']],
},
    "papa-Blank line in middle with whitespace": {
    opt: { header: false, object: false },
    raw: 'a,b,c\r\n \r\nd,e,f',
    out: [['a', 'b', 'c'], [" "], ['d', 'e', 'f']],
},
    "papa-First field of a line is empty": {
    opt: { header: false, object: false },
    raw: 'a,b,c\r\n,e,f',
    out: [['a', 'b', 'c'], ['', 'e', 'f']],
},
    "papa-Last field of a line is empty": {
    opt: { header: false, object: false },
    raw: 'a,b,\r\nd,e,f',
    out: [['a', 'b', ''], ['d', 'e', 'f']],
},
    "papa-Other fields are empty": {
    opt: { header: false, object: false },
    raw: 'a,,c\r\n,,',
    out: [['a', '', 'c'], ['', '', '']],
},
    "papa-Empty input string": {
    opt: { header: false, object: false },
    raw: '',
    out: [],
			errors: [{
				"type": "Delimiter",
				"code": "UndetectableDelimiter",
				"message": "Unable to auto-detect delimiting character; defaulted to ','"
			}]
		}
	},
    "papa-Input is just the delimiter (2 empty fields)": {
    opt: { header: false, object: false },
    raw: ',',
    out: [['', '']],
},
    "papa-Input is just a string (a single field)": {
    opt: { header: false, object: false },
    raw: 'Abc def',
    out: [['Abc def']],
			errors: [
				{
					"type": "Delimiter",
					"code": "UndetectableDelimiter",
					"message": "Unable to auto-detect delimiting character; defaulted to ','"
				}
			]
		}
	},
    "papa-Preview 0 rows should default to parsing all": {
    opt: { header: false, object: false },
    raw: 'a,b,c\r\nd,e,f\r\ng,h,i',
		config: { preview: 0 },
    out: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']],
},
    "papa-Preview 1 row": {
    opt: { header: false, object: false },
    raw: 'a,b,c\r\nd,e,f\r\ng,h,i',
		config: { preview: 1 },
    out: [['a', 'b', 'c']],
},
    "papa-Preview 2 rows": {
    opt: { header: false, object: false },
    raw: 'a,b,c\r\nd,e,f\r\ng,h,i',
		config: { preview: 2 },
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
},
    "papa-Preview all (3) rows": {
    opt: { header: false, object: false },
    raw: 'a,b,c\r\nd,e,f\r\ng,h,i',
		config: { preview: 3 },
    out: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']],
},
    "papa-Preview more rows than input has": {
    opt: { header: false, object: false },
    raw: 'a,b,c\r\nd,e,f\r\ng,h,i',
		config: { preview: 4 },
    out: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']],
},
"papa-Preview should count rows: not lines": {
    opt: { header: false, object: false },
    raw: 'a,b,c\r\nd,e,"f\r\nf",g,h,i',
		config: { preview: 2 },
    out: [['a', 'b', 'c'], ['d', 'e', 'f\r\nf', 'g', 'h', 'i']],
},
    "papa-Preview with header row": {
		notes: "Preview is defined to be number of rows of input not including header row",
    opt: { header: false, object: false },
    raw: 'a,b,c\r\nd,e,f\r\ng,h,i\r\nj,k,l',
		config: { header: true, preview: 2 },
    out: [{"a": "d", "b": "e", "c": "f"}, {"a": "g", "b": "h", "c": "i"}],
},
    "papa-Empty lines": {
    opt: { header: false, object: false },
    raw: '\na,b,c\n\nd,e,f\n\n',
		config: { delimiter: ',' },
    out: [[''], ['a', 'b', 'c'], [''], ['d', 'e', 'f'], [''], ['']],
},
    "papa-Skip empty lines": {
    opt: { header: false, object: false },
    raw: 'a,b,c\n\nd,e,f',
		config: { skipEmptyLines: true },
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
},
"papa-Skip empty lines: with newline at end of input": {
    opt: { header: false, object: false },
    raw: 'a,b,c\r\n\r\nd,e,f\r\n',
		config: { skipEmptyLines: true },
    out: [['a', 'b', 'c'], ['d', 'e', 'f']],
},
"papa-Skip empty lines: with empty input": {
    opt: { header: false, object: false },
    raw: '',
		config: { skipEmptyLines: true },
    out: [],
			errors: [
				{
					"type": "Delimiter",
					"code": "UndetectableDelimiter",
					"message": "Unable to auto-detect delimiting character; defaulted to ','"
				}
			]
		}
	},
"papa-Skip empty lines: with first line only whitespace": {
		notes: "A line must be absolutely empty to be considered empty",
    opt: { header: false, object: false },
    raw: ' \na,b,c',
		config: { skipEmptyLines: true, delimiter: ',' },
    out: [[" "], ['a', 'b', 'c']],
},
    "papa-Skip empty lines while detecting delimiter": {
		notes: "Parsing correctly newline-terminated short data with delimiter:auto and skipEmptyLines:true",
    opt: { header: false, object: false },
    raw: 'a,b\n1,2\n3,4\n',
		config: { header: true, skipEmptyLines: true },
    out: [{'a': '1', 'b': '2'}, {'a': '3', 'b': '4'}],
},
    "papa-Lines with comments are not used when guessing the delimiter in an escaped file": {
		notes: "Guessing the delimiter should work even if there are many lines of comments at the start of the file",
    opt: { header: false, object: false },
    raw: '#1\n#2\n#3\n#4\n#5\n#6\n#7\n#8\n#9\n#10\none,"t,w,o",three\nfour,five,six',
		config: { comments: '#' },
    out: [['one','t,w,o','three'],['four','five','six']],
},
    "papa-Lines with comments are not used when guessing the delimiter in a non-escaped file": {
		notes: "Guessing the delimiter should work even if there are many lines of comments at the start of the file",
    opt: { header: false, object: false },
    raw: '#1\n#2\n#3\n#4\n#5\n#6\n#7\n#8\n#9\n#10\n#11\none,two,three\nfour,five,six',
		config: { comments: '#' },
    out: [['one','two','three'],['four','five','six']],
},
    "papa-Pipe delimiter is guessed correctly when mixed with comas": {
		notes: "Guessing the delimiter should work even if there are many lines of comments at the start of the file",
    opt: { header: false, object: false },
    raw: 'one|two,two|three\nfour|five,five|six',
		config: {},
    out: [['one','two,two','three'],['four','five,five','six']],
},
    "papa-Pipe delimiter is guessed correctly choose avgFildCount max one": {
		notes: "Guessing the delimiter should work choose the min delta one and the max one",
		config: {},
    opt: { header: false, object: false },
    raw: 'a,b,c\na,b,c|d|e|f',
    out: [['a', 'b', 'c'], ['a','b','c|d|e|f']],
},
    "papa-Pipe delimiter is guessed correctly when first field are enclosed in quotes and contain delimiter characters": {
		notes: "Guessing the delimiter should work if the first field is enclosed in quotes, but others are not",
    opt: { header: false, object: false },
    raw: '"Field1,1,1";Field2;"Field3";Field4;Field5;Field6',
		config: {},
    out: [['Field1,1,1','Field2','Field3', 'Field4', 'Field5', 'Field6']],
},
    "papa-Pipe delimiter is guessed correctly when some fields are enclosed in quotes and contain delimiter characters and escaoped quotes": {
		notes: "Guessing the delimiter should work even if the first field is not enclosed in quotes, but others are",
    opt: { header: false, object: false },
    raw: 'Field1;Field2;"Field,3,""3,3";Field4;Field5;"Field6,6"',
		config: {},
    out: [['Field1','Field2','Field,3,"3,3', 'Field4', 'Field5', 'Field6,6']],
},
    "papa-Single quote as quote character": {
		notes: "Must parse correctly when single quote is specified as a quote character",
    opt: { header: false, object: false },
    raw: "a,b,'c,d'",
		config: { quoteChar: "'" },
    out: [['a', 'b', 'c,d']],
},
    "papa-Custom escape character in the middle": {
		notes: "Must parse correctly if the backslash sign (\\) is configured as a custom escape character",
    opt: { header: false, object: false },
    raw: 'a,b,"c\\"d\\"f"',
		config: { escapeChar: '\\' },
    out: [['a', 'b', 'c"d"f']],
},
    "papa-Custom escape character at the end": {
		notes: "Must parse correctly if the backslash sign (\\) is configured as a custom escape character and the escaped quote character appears at the end of the column",
    opt: { header: false, object: false },
    raw: 'a,b,"c\\"d\\""',
		config: { escapeChar: '\\' },
    out: [['a', 'b', 'c"d"']],
},
    "papa-Custom escape character not used for escaping": {
		notes: "Must parse correctly if the backslash sign (\\) is configured as a custom escape character and appears as regular character in the text",
    opt: { header: false, object: false },
    raw: 'a,b,"c\\d"',
		config: { escapeChar: '\\' },
    out: [['a', 'b', 'c\\d']],
},
    "papa-Header row with preceding comment": {
		notes: "Must parse correctly headers if they are preceded by comments",
    opt: { header: false, object: false },
    raw: '#Comment\na,b\nc,d\n',
		config: { header: true, comments: '#', skipEmptyLines: true, delimiter: ',' },
    out: [{'a': 'c', 'b': 'd'}],
},
"papa-Carriage return in header inside quotes: with line feed endings": {
    opt: { header: false, object: false },
    raw: '"a\r\na","b"\n"c","d"\n"e","f"\n"g","h"\n"i","j"',
		config: {},
    out: [['a\r\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
			errors: []
		}

/*
  
  papa-}:
		config: {},
    out: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
},
"papa-Using \\r\\n endings uses \\r\\n linebreak": {
    opt: { header: false, object: false },
    raw: 'a,b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
		config: {},
    out: [['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
			errors: [],
			meta: {
				linebreak: '\r\n',
				delimiter: ',',
				cursor: 23,
				aborted: false,
				truncated: false
			}
		}
	},
"papa-Using \\n endings uses \\n linebreak": {
    opt: { header: false, object: false },
    raw: 'a,b\nc,d\ne,f\ng,h\ni,j',
		config: {},
    out: [['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
			errors: [],
			meta: {
				linebreak: '\n',
				delimiter: ',',
				cursor: 19,
				aborted: false,
				truncated: false
			}
		}
	},
"papa-Using \\r\\n endings with \\r\\n in header field uses \\r\\n linebreak": {
    opt: { header: false, object: false },
    raw: '"a\r\na",b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
		config: {},
    out: [['a\r\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
			errors: [],
			meta: {
				linebreak: '\r\n',
				delimiter: ',',
				cursor: 28,
				aborted: false,
				truncated: false
			}
		}
	},
"papa-Using \\r\\n endings with \\n in header field uses \\r\\n linebreak": {
    opt: { header: false, object: false },
    raw: '"a\na",b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
		config: {},
    out: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
			errors: [],
			meta: {
				linebreak: '\r\n',
				delimiter: ',',
				cursor: 27,
				aborted: false,
				truncated: false
			}
		}
	},
"papa-Using \\r\\n endings with \\n in header field with skip empty lines uses \\r\\n linebreak": {
    opt: { header: false, object: false },
    raw: '"a\na",b\r\nc,d\r\ne,f\r\ng,h\r\ni,j\r\n',
		config: {skipEmptyLines: true},
    out: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
			errors: [],
			meta: {
				linebreak: '\r\n',
				delimiter: ',',
				cursor: 29,
				aborted: false,
				truncated: false
			}
		}
	},
"papa-Using \\n endings with \\r\\n in header field uses \\n linebreak": {
    opt: { header: false, object: false },
    raw: '"a\r\na",b\nc,d\ne,f\ng,h\ni,j',
		config: {},
    out: [['a\r\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
			errors: [],
			meta: {
				linebreak: '\n',
				delimiter: ',',
				cursor: 24,
				aborted: false,
				truncated: false
			}
		}
	},
"papa-Using reserved regex character . as quote character": {
    opt: { header: false, object: false },
    raw: '.a\na.,b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
		config: { quoteChar: '.' },
    out: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
			errors: [],
			meta: {
				linebreak: '\r\n',
				delimiter: ',',
				cursor: 27,
				aborted: false,
				truncated: false
			}
		}
	},
"papa-Using reserved regex character | as quote character": {
    opt: { header: false, object: false },
    raw: '|a\na|,b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
		config: { quoteChar: '|' },
    out: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
			errors: [],
			meta: {
				linebreak: '\r\n',
				delimiter: ',',
				cursor: 27,
				aborted: false,
				truncated: false
			}
		}
	},
"papa-Parsing with skipEmptyLines set to 'greedy'": {
		notes: "Must parse correctly without lines with no content",
    opt: { header: false, object: false },
    raw: 'a,b\n\n,\nc,d\n , \n""," "\n	,	\n,,,,\n',
		config: { skipEmptyLines: 'greedy' },
    out: [['a', 'b'], ['c', 'd']],
},
"papa-Parsing with skipEmptyLines set to 'greedy' with quotes and delimiters as content": {
		notes: "Must include lines with escaped delimiters and quotes",
    opt: { header: false, object: false },
    raw: 'a,b\n\n,\nc,d\n" , ",","\n""" """,""""""\n\n\n',
		config: { skipEmptyLines: 'greedy' },
    out: [['a', 'b'], ['c', 'd'], [' , ', ','], ['" "', '""']],
},
"papa-Quoted fields with spaces between closing quote and next delimiter and contains delimiter": {
    opt: { header: false, object: false },
    raw: 'A,",B" ,C,D\nE,F,G,H',
    out: [['A', ',B', 'C', 'D'],['E', 'F', 'G', 'H']],
},
"papa-Quoted fields with spaces between closing quote and newline and contains newline": {
    opt: { header: false, object: false },
    raw: 'a,b,"c\n" \nd,e,f',
    out: [['a', 'b', 'c\n'], ['d', 'e', 'f']],
			errors: []
		}
	}
];

describe('Parse Tests', function() {
	function generateTest(test) {
		(test.disabled ? it.skip : it)(test.description, function() {
			var actual = Papa.parse(test.input, test.config);
			// allows for testing the meta object if present in the test
			if (test.expected.meta) {
				assert.deepEqual(actual.meta, test.expected.meta);
			}
			assert.deepEqual(actual.errors, test.expected.errors);
			assert.deepEqual(actual.data, test.expected.data);
		});
	}

	for (var i = 0; i < PARSE_TESTS.length; i++) {
		generateTest(PARSE_TESTS[i]);
	}
});



// Tests for Papa.parse() that involve asynchronous operation
var PARSE_ASYNC_TESTS = [
  "papa-Simple worker": {
    opt: { header: false, object: false },
    raw: "A,B,C\nX,Y,Z",
		config: {
			worker: true,
		},
    out: [['A','B','C'],['X','Y','Z']],
  },
  "papa-Simple download": {
    opt: { header: false, object: false },
    raw: BASE_PATH + "sample.csv",
		config: {
			download: true
		},
		disabled: !XHR_ENABLED,
    out: [['A','B','C'],['X','Y','Z']],
  },
  "papa-Simple download + worker": {
    opt: { header: false, object: false },
    raw: BASE_PATH + "sample.csv",
		config: {
			worker: true,
			download: true
		},
		disabled: !XHR_ENABLED,
    out: [['A','B','C'],['X','Y','Z']],
  },
  "papa-Simple file": {
		disabled: !FILES_ENABLED,
    opt: { header: false, object: false },
    raw: FILES_ENABLED ? new File(["A,B,C\nX,Y,Z"], "sample.csv") : false,
		config: {
		},
    out: [['A','B','C'],['X','Y','Z']],
  },
  "papa-Simple file + worker": {
		disabled: !FILES_ENABLED,
    opt: { header: false, object: false },
    raw: FILES_ENABLED ? new File(["A,B,C\nX,Y,Z"], "sample.csv") : false,
		config: {
			worker: true,
		},
    out: [['A','B','C'],['X','Y','Z']],
  },
  "papa-File with a few regular and lots of empty lines": {
		disabled: !FILES_ENABLED,
    opt: { header: false, object: false },
    raw: FILES_ENABLED ? new File(["A,B,C\nX,Y,Z\n" + new Array(500000).fill(",,").join("\n")], "sample.csv") : false,
		config: {
			skipEmptyLines: "greedy"
		},
    out: [['A','B','C'],['X','Y','Z']],
  },
  "papa-File with a few regular and lots of empty lines + worker": {
		disabled: !FILES_ENABLED,
    opt: { header: false, object: false },
    raw: FILES_ENABLED ? new File(["A,B,C\nX,Y,Z\n" + new Array(500000).fill(",,").join("\n")], "sample.csv") : false,
		config: {
			worker: true,
			skipEmptyLines: "greedy"
		},
    out: [['A','B','C'],['X','Y','Z']],
			errors: []
		}
	}
];

describe('Parse Async Tests', function() {
	function generateTest(test) {
		(test.disabled ? it.skip : it)(test.description, function(done) {
			var config = test.config;

			config.complete = function(actual) {
				assert.deepEqual(actual.errors, test.expected.errors);
				assert.deepEqual(actual.data, test.expected.data);
				done();
			};

			config.error = function(err) {
				throw err;
			};

			Papa.parse(test.input, config);
		});
	}

	for (var i = 0; i < PARSE_ASYNC_TESTS.length; i++) {
		generateTest(PARSE_ASYNC_TESTS[i]);
	}
});



// Tests for Papa.unparse() function (JSON to CSV)
var UNPARSE_TESTS = [
  "papa-A simple row": {
		notes: "Comma should be default delimiter",
    opt: { header: false, object: false },
    raw: [['A', 'b', 'c']],
		expected: 'A,b,c'
	},
  "papa-Two rows": {
    opt: { header: false, object: false },
    raw: [['A', 'b', 'c'], ['d', 'E', 'f']],
		expected: 'A,b,c\r\nd,E,f'
	},
  "papa-Data with quotes": {
    opt: { header: false, object: false },
    raw: [['a', '"b"', 'c'], ['"d"', 'e', 'f']],
		expected: 'a,"""b""",c\r\n"""d""",e,f'
	},
  "papa-Data with newlines": {
    opt: { header: false, object: false },
    raw: [['a', 'b\nb', 'c'], ['d', 'e', 'f\r\nf']],
		expected: 'a,"b\nb",c\r\nd,e,"f\r\nf"'
	},
  "papa-Array of objects (header row)": {
    opt: { header: false, object: false },
    raw: [{ "Col1": "a", "Col2": "b", "Col3": "c" }, { "Col1": "d", "Col2": "e", "Col3": "f" }],
		expected: 'Col1,Col2,Col3\r\na,b,c\r\nd,e,f'
	},
"papa-With header row: missing a field in a row": {
    opt: { header: false, object: false },
    raw: [{ "Col1": "a", "Col2": "b", "Col3": "c" }, { "Col1": "d", "Col3": "f" }],
		expected: 'Col1,Col2,Col3\r\na,b,c\r\nd,,f'
	},
"papa-With header row: with extra field in a row": {
		notes: "Extra field should be ignored; first object in array dictates header row",
    opt: { header: false, object: false },
    raw: [{ "Col1": "a", "Col2": "b", "Col3": "c" }, { "Col1": "d", "Col2": "e", "Extra": "g", "Col3": "f" }],
		expected: 'Col1,Col2,Col3\r\na,b,c\r\nd,e,f'
	},
  "papa-Specifying column names and data separately": {
    opt: { header: false, object: false },
    raw: { fields: ["Col1", "Col2", "Col3"], data: [["a", "b", "c"], ["d", "e", "f"]] },
		expected: 'Col1,Col2,Col3\r\na,b,c\r\nd,e,f'
	},
  "papa-Specifying column names only (no data)": {
		notes: "Papa should add a data property that is an empty array to prevent errors (no copy is made)",
    opt: { header: false, object: false },
    raw: { fields: ["Col1", "Col2", "Col3"] },
		expected: 'Col1,Col2,Col3'
	},
"papa-Specifying data only (no field names): improperly": {
		notes: "A single array for a single row is wrong, but it can be compensated.<br>Papa should add empty fields property to prevent errors.",
    opt: { header: false, object: false },
    raw: { data: ["abc", "d", "ef"] },
		expected: 'abc,d,ef'
	},
"papa-Specifying data only (no field names): properly": {
		notes: "An array of arrays, even if just a single row.<br>Papa should add empty fields property to prevent errors.",
    opt: { header: false, object: false },
    raw: { data: [["a", "b", "c"]] },
		expected: 'a,b,c'
	},
  "papa-Custom delimiter (semicolon)": {
    opt: { header: false, object: false },
    raw: [['A', 'b', 'c'], ['d', 'e', 'f']],
		config: { delimiter: ';' },
		expected: 'A;b;c\r\nd;e;f'
	},
  "papa-Custom delimiter (tab)": {
    opt: { header: false, object: false },
    raw: [['Ab', 'cd', 'ef'], ['g', 'h', 'ij']],
		config: { delimiter: '\t' },
		expected: 'Ab\tcd\tef\r\ng\th\tij'
	},
  "papa-Custom delimiter (ASCII 30)": {
    opt: { header: false, object: false },
    raw: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { delimiter: RECORD_SEP },
		expected: 'a' + RECORD_SEP + 'b' + RECORD_SEP + 'c\r\nd' + RECORD_SEP + 'e' + RECORD_SEP + 'f'
	},
  "papa-Custom delimiter (Multi-character)": {
    opt: { header: false, object: false },
    raw: [['A', 'b', 'c'], ['d', 'e', 'f']],
		config: { delimiter: ', ' },
		expected: 'A, b, c\r\nd, e, f'
	},
"papa-Custom delimiter (Multi-character): field contains custom delimiter": {
    opt: { header: false, object: false },
    raw: [['A', 'b', 'c'], ['d', 'e', 'f, g']],
		config: { delimiter: ', ' },
		expected: 'A, b, c\r\nd, e, "f, g"'
	},
  "papa-Bad delimiter (\\n)": {
		notes: "Should default to comma",
    opt: { header: false, object: false },
    raw: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { delimiter: '\n' },
		expected: 'a,b,c\r\nd,e,f'
	},
  "papa-Custom line ending (\\r)": {
    opt: { header: false, object: false },
    raw: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { newline: '\r' },
		expected: 'a,b,c\rd,e,f'
	},
  "papa-Custom line ending (\\n)": {
    opt: { header: false, object: false },
    raw: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { newline: '\n' },
		expected: 'a,b,c\nd,e,f'
	},
"papa-Custom: but strange, line ending ($)": {
    opt: { header: false, object: false },
    raw: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { newline: '$' },
		expected: 'a,b,c$d,e,f'
	},
  "papa-Force quotes around all fields": {
    opt: { header: false, object: false },
    raw: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { quotes: true },
		expected: '"a","b","c"\r\n"d","e","f"'
	},
  "papa-Force quotes around all fields (with header row)": {
    opt: { header: false, object: false },
    raw: [{ "Col1": "a", "Col2": "b", "Col3": "c" }, { "Col1": "d", "Col2": "e", "Col3": "f" }],
		config: { quotes: true },
		expected: '"Col1","Col2","Col3"\r\n"a","b","c"\r\n"d","e","f"'
	},
  "papa-Force quotes around certain fields only": {
    opt: { header: false, object: false },
    raw: [['a', 'b', 'c'], ['d', 'e', 'f']],
		config: { quotes: [true, false, true] },
		expected: '"a",b,"c"\r\n"d",e,"f"'
	},
  "papa-Force quotes around certain fields only (with header row)": {
    opt: { header: false, object: false },
    raw: [{ "Col1": "a", "Col2": "b", "Col3": "c" }, { "Col1": "d", "Col2": "e", "Col3": "f" }],
		config: { quotes: [true, false, true] },
		expected: '"Col1",Col2,"Col3"\r\n"a",b,"c"\r\n"d",e,"f"'
	},
  "papa-Force quotes around string fields only": {
    opt: { header: false, object: false },
    raw: [['a', 'b', 'c'], ['d', 10, true]],
		config: { quotes: function(value) { return typeof value === 'string'; } },
		expected: '"a","b","c"\r\n"d",10,true'
	},
  "papa-Force quotes around string fields only (with header row)": {
    opt: { header: false, object: false },
    raw: [{ "Col1": "a", "Col2": "b", "Col3": "c" }, { "Col1": "d", "Col2": 10, "Col3": true }],
		config: { quotes: function(value) { return typeof value === 'string'; } },
		expected: '"Col1","Col2","Col3"\r\n"a","b","c"\r\n"d",10,true'
	},
  "papa-Empty input": {
    opt: { header: false, object: false },
    raw: [],
		expected: ''
	},
  "papa-Mismatched field counts in rows": {
    opt: { header: false, object: false },
    raw: [['a', 'b', 'c'], ['d', 'e'], ['f']],
		expected: 'a,b,c\r\nd,e\r\nf'
	},
  "papa-JSON null is treated as empty value": {
    opt: { header: false, object: false },
    raw: [{ "Col1": "a", "Col2": null, "Col3": "c" }],
		expected: 'Col1,Col2,Col3\r\na,,c'
	},
  "papa-Custom quote character (single quote)": {
    opt: { header: false, object: false },
    raw: [['a,d','b','c']],
		config: { quoteChar: "'"},
		expected: "'a,d',b,c"
	},
  "papa-Don't print header if header:false option specified": {
    opt: { header: false, object: false },
    raw: [{"Col1": "a", "Col2": "b", "Col3": "c"}, {"Col1": "d", "Col2": "e", "Col3": "f"}],
		config: {header: false},
		expected: 'a,b,c\r\nd,e,f'
	},
  "papa-Date objects are exported in its ISO representation": {
    opt: { header: false, object: false },
    raw: [{date: new Date("2018-05-04T21:08:03.269Z"), "not a date": 16}, {date: new Date("Tue May 08 2018 08:20:22 GMT-0700 (PDT)"), "not a date": 32}],
		expected: 'date,not a date\r\n2018-05-04T21:08:03.269Z,16\r\n2018-05-08T15:20:22.000Z,32'
	},
  "papa-Returns empty rows when empty rows are passed and skipEmptyLines is false": {
    opt: { header: false, object: false },
    raw: [[null, ' '], [], ['1', '2']],
		config: {skipEmptyLines: false},
		expected: '," "\r\n\r\n1,2'
	},
  "papa-Returns without empty rows when skipEmptyLines is true": {
    opt: { header: false, object: false },
    raw: [[null, ' '], [], ['1', '2']],
		config: {skipEmptyLines: true},
		expected: '," "\r\n1,2'
	},
  "papa-Returns without rows with no content when skipEmptyLines is 'greedy'": {
    opt: { header: false, object: false },
    raw: [[null, ' '], [], ['1', '2']].concat(new Array(500000).fill(['', ''])).concat([['3', '4']]),
		config: {skipEmptyLines: 'greedy'},
		expected: '1,2\r\n3,4'
	},
  "papa-Returns empty rows when empty rows are passed and skipEmptyLines is false with headers": {
    opt: { header: false, object: false },
    raw: [{a: null, b: ' '}, {}, {a: '1', b: '2'}],
		config: {skipEmptyLines: false, header: true},
		expected: 'a,b\r\n," "\r\n\r\n1,2'
	},
  "papa-Returns without empty rows when skipEmptyLines is true with headers": {
    opt: { header: false, object: false },
    raw: [{a: null, b: ' '}, {}, {a: '1', b: '2'}],
		config: {skipEmptyLines: true, header: true},
		expected: 'a,b\r\n," "\r\n1,2'
	},
  "papa-Returns without rows with no content when skipEmptyLines is 'greedy' with headers": {
    opt: { header: false, object: false },
    raw: [{a: null, b: ' '}, {}, {a: '1', b: '2'}],
		config: {skipEmptyLines: 'greedy', header: true},
		expected: 'a,b\r\n1,2'
	},
  "papa-Column option used to manually specify keys": {
		notes: "Should not throw any error when attempting to serialize key not present in object. Columns are different than keys of the first object. When an object is missing a key then the serialized value should be an empty string.",
    opt: { header: false, object: false },
    raw: [{a: 1, b: '2'}, {}, {a: 3, d: 'd', c: 4,}],
		config: {columns: ['a', 'b', 'c']},
		expected: 'a,b,c\r\n1,2,\r\n\r\n3,,4'
	},
  "papa-Column option used to manually specify keys with input type object": {
		notes: "Should not throw any error when attempting to serialize key not present in object. Columns are different than keys of the first object. When an object is missing a key then the serialized value should be an empty string.",
    opt: { header: false, object: false },
    raw: { data: [{a: 1, b: '2'}, {}, {a: 3, d: 'd', c: 4,}] },
		config: {columns: ['a', 'b', 'c']},
		expected: 'a,b,c\r\n1,2,\r\n\r\n3,,4'
	},
  "papa-Use different escapeChar": {
    opt: { header: false, object: false },
    raw: [{a: 'foo', b: '"quoted"'}],
		config: {header: false, escapeChar: '\\'},
		expected: 'foo,"\\"quoted\\""'
	},
  "papa-test defeault escapeChar": {
    opt: { header: false, object: false },
    raw: [{a: 'foo', b: '"quoted"'}],
		config: {header: false},
		expected: 'foo,"""quoted"""'
	},
  "papa-Escape formulae": {
    opt: { header: false, object: false },
    raw: [{ "Col1": "=danger", "Col2": "@danger", "Col3": "safe" }, { "Col1": "safe=safe", "Col2": "+danger", "Col3": "-danger, danger" }, { "Col1": "'+safe", "Col2": "'@safe", "Col3": "safe, safe" }],
		config: { escapeFormulae: true },
		expected: 'Col1,Col2,Col3\r\n"\'=danger","\'@danger",safe\r\nsafe=safe,"\'+danger","\'-danger, danger"\r\n\'+safe,\'@safe,"safe, safe"'
	},
  "papa-Don't escape formulae by default": {
    opt: { header: false, object: false },
    raw: [{ "Col1": "=danger", "Col2": "@danger", "Col3": "safe" }, { "Col1": "safe=safe", "Col2": "+danger", "Col3": "-danger, danger" }, { "Col1": "'+safe", "Col2": "'@safe", "Col3": "safe, safe" }],
		expected: 'Col1,Col2,Col3\r\n=danger,@danger,safe\r\nsafe=safe,+danger,"-danger, danger"\r\n\'+safe,\'@safe,"safe, safe"'
	},
  "papa-Escape formulae with forced quotes": {
    opt: { header: false, object: false },
    raw: [{ "Col1": "=danger", "Col2": "@danger", "Col3": "safe" }, { "Col1": "safe=safe", "Col2": "+danger", "Col3": "-danger, danger" }, { "Col1": "'+safe", "Col2": "'@safe", "Col3": "safe, safe" }],
		config: { escapeFormulae: true, quotes: true },
		expected: '"Col1","Col2","Col3"\r\n"\'=danger","\'@danger","safe"\r\n"safe=safe","\'+danger","\'-danger, danger"\r\n"\'+safe","\'@safe","safe, safe"'
	},
  "papa-Escape formulae with single-quote quoteChar and escapeChar": {
    opt: { header: false, object: false },
    raw: [{ "Col1": "=danger", "Col2": "@danger", "Col3": "safe" }, { "Col1": "safe=safe", "Col2": "+danger", "Col3": "-danger, danger" }, { "Col1": "'+safe", "Col2": "'@safe", "Col3": "safe, safe" }],
		config: { escapeFormulae: true, quoteChar: "'", escapeChar: "'" },
		expected: 'Col1,Col2,Col3\r\n\'\'\'=danger\',\'\'\'@danger\',safe\r\nsafe=safe,\'\'\'+danger\',\'\'\'-danger, danger\'\r\n\'\'+safe,\'\'@safe,\'safe, safe\''
	},
  "papa-Escape formulae with single-quote quoteChar and escapeChar and forced quotes": {
    opt: { header: false, object: false },
    raw: [{ "Col1": "=danger", "Col2": "@danger", "Col3": "safe" }, { "Col1": "safe=safe", "Col2": "+danger", "Col3": "-danger, danger" }, { "Col1": "'+safe", "Col2": "'@safe", "Col3": "safe, safe" }],
		config: { escapeFormulae: true, quotes: true, quoteChar: "'", escapeChar: "'" },
		expected: '\'Col1\',\'Col2\',\'Col3\'\r\n\'\'\'=danger\',\'\'\'@danger\',\'safe\'\r\n\'safe=safe\',\'\'\'+danger\',\'\'\'-danger, danger\'\r\n\'\'\'+safe\',\'\'\'@safe\',\'safe, safe\''
	},
	// new escapeFormulae values:
  "papa-Escape formulae with tab and carriage-return": {
    opt: { header: false, object: false },
    raw: [{ "Col1": "\tdanger", "Col2": "\rdanger,", "Col3": "safe\t\r" }],
		config: { escapeFormulae: true },
		expected: 'Col1,Col2,Col3\r\n"\'\tdanger","\'\rdanger,","safe\t\r"'
	},
"papa-Escape formulae with tab and carriage-return: with forced quotes": {
    opt: { header: false, object: false },
    raw: [{ "Col1": "	danger", "Col2": "\rdanger,", "Col3": "safe\t\r" }],
		config: { escapeFormulae: true, quotes: true },
		expected: '"Col1","Col2","Col3"\r\n"\'\tdanger","\'\rdanger,","safe\t\r"'

  papa-}:
		config: { escapeFormulae: true, quoteChar: "'", escapeChar: "'" },
		expected: 'Col1,Col2,Col3\r\n\'\'\'\tdanger\',\'\'\'\rdanger,\',\'safe, \t\r\''

  papa-}:
		config: { escapeFormulae: true, quotes: true, quoteChar: "'", escapeChar: "'" },
		expected: '\'Col1\',\'Col2\',\'Col3\'\r\n\'\'\'\tdanger\',\'\'\'\rdanger,\',\'safe, \t\r\''
	},
];
*/  
}
