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

The module exports a single class `URLReference` with **nullable** properties (getters/setters):

- `scheme`,
- `username`, `password`, `hostname`, `port`,
- `pathname`, `pathroot`, `driveletter`, `filename`,  
- `query`, `fragment`.

It has three key methods:

- `rebase`, `normalize` and `resolve`.

It can be converted to an ASCII, or to a Unicode string via:

- the `href` getter and the `toString` method.


### Terminology

* **Special**:
The WHATWG URL standard uses the phrase "__special URL__" for URLs that have a "_special scheme_". 
A "_special scheme_" is a scheme that is equivalent to `http`, `https`, `ws`, `wss`, `ftp` or `file`.

* **Hierarchical**:
The _path_ of an URL may either be **hierarchical** or **opaque**. An _hierarchical path_ is subdivided into smaller components, an _opaque path_ is not.  

  (!) The path of a "_special_" URL is always hierarchical. The path of a non-special URL is hierarchical if the URL has an authority or otherwise if its path starts with a path-root `/`.

* **Rebase** is a generalisation of [reference transformation] as defined in the RFC3986 (URI) that supports constructing relative references. The base argument may be a relative reference, in addition to an absolute URL.

* **Non-strict**: The RFC3986 (URI) standard defines a **strict** and a **non-strict** variant of _reference transformation_. The _non-strict_ variant ignores the scheme of the input if it is equivalent to the scheme of the base. The WHATWG uses the _non-strict_ behaviour for "special" URLs and the _strict_ behaviour for other URLs.

[RFC3986]: https://www.rfc-editor.org/rfc/rfc3986
[reference transformation]: https://www.rfc-editor.org/rfc/rfc3986#section-5.2.2


### URLReference

**Constructor**

- `new URLReference ()`
- `new URLReference (input)`
- `new URLReference (input, base)`

Constructs a new URLReference object. The result _may_ represent a relative URL. The _resolve_ method can be used to ensure that the result represents an absolute URL.

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

**Parsing behaviour**

The parsing behaviour is adapted according to the scheme of `input` or the scheme of `base` otherwise.

- The hostname is parsed as an opaque hostname string.
- The parsing and validation of a hostname as a domain is done in the resolve method instead.
- The invalid `\` code-points before the host and in the path are converted to `/` if the input has a special scheme or if it has no scheme at all.
- Windows drive letters are detected if the scheme is equivalent to `file` or if no scheme is present. 
- If no scheme is present and a windows drive letter is detected then then the scheme is implicitly set to `file`.

```javascript
const r1 = new URLReference ('\\foo\\bar', 'http:')
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

The _base_ argument may be a string or an URLReference object.

Rebase implements a slight generalisation of [reference transformation] as defined in RFC3986 (URI).
Rebase returns a new URLReference instance, or throws an error if the base argument reprensents an URL with an _opaque path_.

Rebase applies a "non-strict" reference transformation to URLReferences that have a "special scheme". This legacy behaviour is required to achieve compatibility with the WHATWG URL Standard.

*Note*: A "non-strict reference transformation" ignores the scheme of the input if it matches the scheme of the base. This has a surprising consequence: An URLReference that has a special scheme may still behave as a relative URL:

```javascript
const base = new URLReference ('http://host/dir/')
const rel = new URLReference ('http:?do=something')
const rebased = rel.rebase (base)
// rebased.href == 'http://host/dir/?do=something'
```

Rebase applies a "strict" reference transformation to non-special URLReferences. The strict variant does not remove the scheme from the input.

```javascript
const base = new URLReference ('ofp://host/dir/')
const abs = new URLReference ('ofp:?do=something')
const rebased = abs.rebase (base)
// rebased.href == 'ofp:?do=something'
```

It is not possible to rebase a relative URLReference on a base that has an _opaque path_. 

```javascript
const base = new URLReference ('ofp:this/is/an/opaque-path/')
const rel = new URLReference ('filename.txt')
// const rebased = rel.rebase (base) // throws:
// TypeError: Cannot rebase <filename.txt> onto <ofp:this/is/an/opaque-path/>

const base2 = new URLReference ('ofp:/not/an/opaque-path/')
const rebased = rel.rebase (base2) // This works as expected
// rebased.href == 'ofp:/not/an/opaque-path/filename.txt'
```


**Normalize** – `urlReference .normalize ()`

Normalize collapses dotted segments in the path, removes default ports and percent encodes certain code-points. It behaves in the same way as the WHATWG URL constructor, except for the fact that it supports relative URLs. Normalize always returns a new URLReference instance. 

**Resolve** 

- `urlReference .resolve ()`
- `urlReference .resolve (base)`

The optional `base` argument may be a string or an existing URLReference object. 

Resolve returns a new URLReference that represents an absolute URL, or throws an error if this is not possible. It uses the same forceful error correcting behaviour as the WHATWG URL constructor.

*Note*: An unpleasant aspect of the WHATWG behaviour is that if the input is a non-file special URL, and the input has no authority, then the first non-empty path component will be coerced to an authority:


```javascript
const r1 = new URLReference ('http:/foo/bar')
// r.host == null
// r.pathname == '/foo/bar'

const r2 = r1.resolve ('http://host/')
// The scheme of r1 is ignored because it matches the base.
// Thus the hostname is taken from the base.
// r2.href == 'http://host/foo/bar'

const r3 = r1.resolve ()
// r1 does not have an authority, so the first non-empty path
// component `foo` is coerced into an authority for the result.
// r1.href == 'http://foo/bar'
```

Resolve does additional processing and checks on the authority:

- Asserts that file-URLs and web-URLs have an authority.
- Asserts that the authority of web-URLs is not empty.
- Asserts that file-URLs do not have a username, password or port.
- Parses opaque hostnames of file-URLs and web-URLs as a domain or an ip-address.

**String** – `urlReference .toString ()`

Converts the URLReference to a string. This _preserves_ unicode characters in the URL, unlike the `href` getter which ensures that the result consists of ASCII code-points only.

```javascript
new URLReference ('take/action.html') .resolve ('http://🌲') .toString ()
// => 'http://🌲/take/action.html'

new URLReference ('take/action.html') .resolve ('http://🌲') .href
// => 'http://xn--vh8h/take/action.html'
```


### Properties

Access to the components of the URLReference goes through the following getters/setters.
All properties are nullable, however some invariants are maintained.

- `scheme`
- `username`
- `password`
- `hostname`
- `port`
- `pathname`
+ `driveletter`
+ `pathroot`
+ `filename`
- `query`
- `fragment`


Licence
-------

MIT Licenced.  
