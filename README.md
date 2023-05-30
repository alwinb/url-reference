# This is a teaser. Stay tuned!

* * * 

URLReference
============

"URL or Relative Reference" 

The `URLReference` class is designed to overcome shortcomings of the `URL` class.

#### Features

- Supports **Relative** and scheme-less URLs.
- Supports **Nullable Components**.
- Distinct **Rebase**, **Normalize** and **Resolve** methods.
- Resolve is **Behaviourally Equivalent** with the WHATWG URL Standard.

#### Examples

```javascript
new URLReference ('filename.txt#top', '//host') .href
// => '//host/filename.txt#top'

new URLReference ('?do=something', './path/to/resource') .href
// => './path/to/resource?do=something'

new URLReference ('take/action.html') .resolve ('http://🌲') .href
// => 'http://xn--vh8h/take/action.html'
```


API
---

### Summary

The module exports a single class `URLReference` with nullable properties (getters/setters):

- `scheme`,
- `username`, `password`, `hostname`, `port`,
- `pathname`, `pathroot`, `driveletter`, `dirpathname`, `filename`,  
- `query`, `fragment`.

It has three key methods:

- `rebase`, `normalize` and `resolve`.

It can be converted to an ASCII, or a Unicode string via:

- the `href` getter and the `toString` method.


### URLReference

**Constructor**

- `new URLReference ()`
- `new URLReference (input)`
- `new URLReference (input, base)`

Constructs a new URLReference object. The result _may_ represent a relative URL. To ensure that the result represents an absolute URL, the _resolve_ method must be applied after construction.

Arguments `input` and `base` are optional. Each may be a string to be parsed, or an existing URLReference object. If a `base` argument is supplied, then `input` is *rebased* onto `base` after parsing.

```javascript
const r1 = new URLReference ();
// r.href == '' // The 'empty relative URL'

const r2 = new URLReference ('/big/trees/');
// r.href == '/big/trees/'

const r3 = new URLReference ('index.html', '/big/trees/');
// r.href == '/big/trees/index.html'

const r4 = new URLReference ('README.md', r3);
// r.href == '/big/trees/README.md'
```

**Special Parsing behaviour**

The parsing behviour is adapted according to the scheme of `input` or the scheme of `base` otherwise.

- The invalid `\` characters are treated as `/` delimiters if the scheme is equivalent to `http`, `https`, `ws`, `wss`, `ftp` or `file`, or if no scheme is present.
- Windows drive letters are detected if the scheme is equivalent to `file` or if no scheme is present. If a drive letter is found and no scheme is present, then the scheme is explicitly set to `file`.
- NB. The hostname is parsed as an opaque hostname string. The parsing of a hostname as a domain is handled by the resolve method instead.
  
```javascript
const r1 = new URLReference ('\\foo\\bar', 'http:/')
// r1.href == 'http:/foo/bar'

const r2 = new URLReference ('\\foo\\bar', 'ofp:/')
// r2.href == 'ofp:/\\foo\\bar'

const r3 = new URLReference ('/c:/path/to/file')
// r3.href == 'file:/c:/path/to/file'
// r3.hostname == null
// r3.driveletter == 'c:'

const r4 = new URLReference ('/c:/path/to/file', 'http:')
// r4.href == 'http:/c:/path/to/file'
// r4.hostname == null
// r4.driveletter == null

```

### Methods

**Rebase** – `urlReference .rebase (base)`

The base argument may be a string or an existing URLReference object.

Rebase implements a slight generalisation of "[reference transformation]" as defined in RFC3986.
Rebase always returns a new URLReference instance, or throws an Error. 

Rebase applies a "non-strict" reference transformation to URLReferences that have a "special scheme". A special scheme is a scheme that is equivalent to `http`, `https`, `ws`, `wss`, `ftp` or `file`. This legacy behaviour is required to achieve compatibility with the WHATWG URL Standard.

[reference transformation]: https://www.rfc-editor.org/rfc/rfc3986#section-5.2.2

*Note*: A "non-strict reference transformation" removes the scheme from the input if it is a special-scheme that matches the scheme of the base. This has a surprising consequence: An URLReference that has a special scheme may still be a relative URL:

```javascript
const base = new URLReference ('http://host/dir/')
const rel = new URLReference ('http:?do=something')
const rebased = rel.rebase (base)
// rebased.href == 'http://host/dir/?do=something'
```

Rebase applies a "sctrict" reference transformation to non-special URLReferences. The strict variant does not remove the scheme from the URLReference (The consequence is that an URLReference with a non-special scheme is an absolute URL):

```javascript
const base = new URLReference ('ofp://host/')
const abs = new URLReference ('ofp:?do=something')
const rebased = abs.rebase (base)
// rebased.href == 'ofp:?do=something'
```

It is not possible to rebase a relative URLReference on a base that has 'an opaque path'. 
An URLReference has an opaque path if it has a non-special-scheme but no authority, nor a path-root.

```javascript
const base = new URLReference ('ofp:this/is/an/opaque-path')
const rel = new URLReference ('filename.txt')
// const rebased = rel.rebase (base) // throws:
// TypeError: Cannot rebase <filename.txt> onto <ofp:this/is/an/opaque-path>

const base2 = new URLReference ('ofp:/not/an/opaque-path/')
const rebased = rel.rebase (base2) // This (actually) is fine
// rebased.href == 'ofp:/not/an/opaque-path/filename.txt'
```



**Normalize** – `urlReference .normalize ()`

Normalize collapses dotted segments in the path, removes default ports and percent encodes certain code-points. It behaves in the same way as the WHATWG URL constructor, except for the fact that it supports relative URLs. Normalize always returns a new URLReference instance. 

**Resolve** 

- `urlReference .resolve ()`
- `urlReference .resolve (base)`

The optional `base` argument may be a string or an existing URLReference object. 

Resolve rebases an URLReference; forces special URLs to have an appropriate authority and a path-root; and normalizes the result. Resolve returns a new URLReference that represents an absolute URL, or throws an Error if this is not possible.

Resolve uses the same forceful error correcting behaviour as the WHATWG URL constructor.
**NB** this means that it will reinterpret the first non-empty path component of a non-file special URL as an authority.


```javascript
const r1 = new URLReference ('http:/foo/bar')
// NB r1 represents a host-relative URL:
// r.host == null
// r.pathname == '/foo/bar'

const r2 = r1.resolve ('http://host/')
// The hostname is taken from the base URL:
// r2.href == 'http://host/foo/bar'

const r3 = r1.resolve ()
// Otherwise the first non-empty path component is forcibly converted to a hostname
// r1.href == 'http://foo/bar'
```

Resolve does additional processing and checks on the authority:

- Asserts that file-URLs and web-URLs have an authority.
- Asserts that the authority of web-URLs is not empty.
- Asserts that file-URLs do not have a username, password or port.
- Parses opaque hostnames of file-URLs and web-URLs as a domain or an ip-address.

**String** – `urlReferece .toString ()`

Converts the URLReference to a string. This _preserves_ unicode characters in the URL, unlike the `href` getter which ensures that the result consists of ASCII code-points only.


### Properties

Access to the components of the URLReference goes through the following getters/setters.
All properties are nullable, however some invariants are maintained.

- scheme
- username
- password
- hostname
- port
- pathname
+ pathroot
+ driveletter
+ dirpathname
+ filename
+ query
+ fragment

Invariants:

- If the URLReference has a non-null `password`, then it also has a non-null `username`.
- If the URLReference has a non-null `username`, or a non-null `port`, then it also has a non-null `hostname`.
- If the URLReference has a `hostname` or a `driveletter`, and it also has a `dirpathname` or a `filename`, then it also has a non-null `pathroot`.
- If the URLReference has a non-null `driveletter` then its scheme is a case-insensative equivalent of `file`.

Where,

+ The `pathroot` is either null, or the string `/`.
+ The `driveletter` is either null, or a two-character string consisting of a character in the range {`A`–`Z`} or {`a`–`z`} followed by either a `:` or a `|`.
+ …


Licence
-------

MIT Licenced.  
