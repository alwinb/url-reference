import * as core from '../spec-url/src/index.js'
const log = console.log.bind (console)


// URLReference class
// ==================

// An URLReference object is implemented as a wrapper around what is here called an URLRecord:
// An object that represents an URL in the format that is used by the spec-url / core parser and
// resolution methods. This 'raw' URL Record object is stored under the property with a Symbol-key
// recordKey, abbreviated to $ for convenience.

const recordKey = Symbol ()
const $ = recordKey

// If a non-URLReference value is passed as an argument where an URLReference is expected, then it
// is stringified and parsed. 

function toURLRecord (input, mode = core.modes.noscheme) {
  return input == null ? {}
    : typeof input === 'object' && input instanceof URLReference ? cloneURLRecord (input[$])
    : typeof input === 'string' ? parseURLRecord (input, mode)
    : parseURLRecord (String (input), mode)
  return record
}

// The parser implicitly adds the 'file' scheme to scheme-less URLs that 
// do start with a windows drive letter.

function parseURLRecord (input, mode) {
  const record = core.parse (input, mode)
  if (record.drive && !record.scheme) record.scheme = 'file'
  return record
}

function cloneURLRecord (obj) {
  const result = Object.assign ({}, obj)
  if (obj.dirs) result.dirs = obj.dirs.slice (0)
  return result
}

// The following is just a convenience;

function low (input) {
  return input == null ? null :
  String (input) .toLowerCase ()
}

// Here it goes! The URLReference class.

class URLReference {

  constructor (input, base = null) {
    base = toURLRecord (base)
    if (base != null) {
      input = toURLRecord (input, core.modeFor (base))
      this[$] = core.rebase (input, base)
    }
    else {
      input = toURLRecord (input)
      this[$] = input
    }
  }

  // Methods

  rebase (base) {
    const r = new URLReference ()
    r[$] = core.rebase (this[$], toURLRecord (base))
    return r
  }
  
  resolve (base = null) {
    base = toURLRecord (base)
    const r = new URLReference ()
    r[$] = base != null
      ? core.normalise (core.resolve (this[$], base))
      : core.normalise (core.resolve (this[$]))
    return r
  }

  normalize () {
    const r = new URLReference ()
    r[$] = core.normalize (this[$])
    return r
  }
  
  normalise () {
    return this.normalize ()
  }

  toString () {
    return core.print (this[$], 'URL')
  }

  toJSON () {
    return core.print (this[$], 'WHATWG')
  }

  get href () {
    return core.print (this[$], 'WHATWG')
  }

  // Getters

  get scheme () {
    return this[$].scheme ?? null
  }

  get username () {
    return this[$].user ?? null
  }

  get password () {
    return this[$].pass ?? null
  }

  get hostname () {
    return (this[$].host != null
      ? core.printHost (this[$].host)
      : null)
  }

  get port () {
    return this[$].port ?? null
  }
  
  // driveletter, pathroot and filename do not use the idiomatic
  // camelCase style. This is is done to remain consistent with the
  // existing property names such as pathname and hostname.

  get driveletter () {
    return this[$].drive ?? null
  }

  get pathroot () {
    return this[$].root ?? null
  }

  get filename () {
    return this[$].file ?? null
  }
  
 // REVIEW should this ever return null?
  get pathname () {
    return core.pathname (this[$])
  }

  get query () {
    return this[$].query ?? null
  }

  get fragment () {
    return this[$].fragment ?? null
  }
  
  /* Getters 'protocol', 'search' and 'hash' are present
  // for compatability with the legacy URL API. They are 
  // nullable, but otherwise use the legacy behaviour.

  get protocol () {
    return (this[$].scheme
      ? this[$].scheme + ':'
      : null)
  }

  get search () {
    return (this[$].query != null
      ? '?' + this[$].query
      : null)
  }

  get hash () {
    return (this[$].hash != null
      ? '#' + this[$].hash
      : null)
  }
  //*/


  // Setters

  set scheme (value) {
    if (this[$].drive != null && (value == null || low (this[$].scheme) !== 'file'))
      throw new Error (`URLReference: cannot change the scheme of <${this}> because it has a drive-letter`)

    if (value == null)
      return delete this[$].scheme

    value = String (value)
    if (/^[A-Za-z][A-Za-z0-9+-.]+$/ .test (value))
      this[$].scheme = value

    else
      throw new Error (`URLReference: cannot change the scheme of <${this}> using an invalid scheme-string`)
  }

  // NB Setting the username also resets the password.

  set username (value) {
    if (value == null) {
      delete this[$].pass
      return delete this[$].user
    }
    if (this[$].host == null)
      throw new Error (`URLReference: cannot set a username on <${this}> because it does not have a hostname`)
    this[$].user = String (value)
    delete this[$].pass
  }

  set password (value) {
    if (value == null)
      return delete this[$].pass

    if (!this[$].host)
      throw new Error (`URLReference: cannot set a password on <${this}> because it does not have a hostname`)

    if (this[$].user == null)
      throw new Error (`URLReference: cannot set a password on <${this}> because it does not have a username`)

    this[$].pass = String (value)
  }

  // NB Setting the hostname also resets the username, password and port
  // If the URL has dir or file components then it also sets the path-root

  set hostname (value) {
    const r = this[$]
    delete r.user
    delete r.pass
    delete r.port
    if (value == null)
      delete r.host
    else {
      r.host = String (value)
      if (r.dirs || r.file) r.root = '/'
    }
  }

  set port (value) {
    if (value == null)
      return delete this[$].port

    if (this[$].host == null)
      throw new Error (`URLReference: cannot set a port on <${this}> because it does not have a hostname`)

    if (value === '')
      return this[$].port = ''

    while (true) { // being creative ?

      if (typeof value === 'number') {
        value = Math.floor (value)
        if (value >= 1<<16) throw new Error (`URLReference: cannot set the port on <${this}> to a value larger than 2**16 - 1`)
        return this[$].port = value
      }

      else {
        value = String (value)
        if (!/^[0-9]+$/.test (value))
          throw new Error (`URLReference: cannot set the port on <${this}> using a string that contains non-digit characters`)
        value = parseInt (value, 10)
      }
    } // very funny /;P

  }

  // NB Setting a drive-letter will also set the scheme to "file". If a non-file
  // scheme is present then setting a drive-letter results in an error.
  // If the URL has dir or file components then setting the drive-letter will also
  // set the path-root.

  set driveletter (value) {
    if (value == null)
      return delete this[$].drive

    value = String (value)
    const scheme = this[$].scheme
    if (scheme && low (scheme) !== 'file')
      throw new Error (`URLReference: cannot set a drive-letter on <${this}> because it does not have a file-scheme`)

    if (!/^[A-Za-z][:|]?$/ .test (value))
      throw new Error (`URLReference: cannot set the drive-letter on <${this}> using a string that is not a drive-letter`)

    if (scheme == null) this[$].scheme = 'file'

    this[$].drive = value.length == 1 ? value + ':' : value
    if (this[$].dirs || this[$].file) this[$].root = '/'
  }

  set pathroot (value) {
    const r = this[$]
    if (value) r.root = '/'
    else if ((r.host != null || r.drive) && (r.dirs || r.file))
      throw new Error (`URLReference: cannot remove the path-root from <${this}>`)
    delete r.root
  }

  set filename (value) {
    if (value == null) return delete this[$].file
    if ((value = String (value)) && value.length) {
      this[$].file = value
      if (this[$].drive || this[$].host != null) this[$].root = '/'
    }
    else throw new Error (`URLReference: cannot set the filename of <${this}> to the empty string`)
  }

  // the pathname consists of
  // drive, root, dirs, file

  // REVIEW should this detect drives if no scheme is present?
  // I do detect drives when parsing schemeless URL strings,
  // but I'm not sure this is a good idea for the pathname setter

  set pathname (value) {
    const r = this[$]
    if (value == null || value === '') {
      delete r.drive
      delete r.root
      delete r.dirs
      delete r.file
      return
    }
    const mode = core.modeFor (r, core.modes.file)
    const path = core.parsePath (value, mode)
    // if (path.drive && !this[$].scheme)
    //   this[$].scheme = 'file'
    Object.assign (r, path)
    if ((r.host != null || r.drive) && (r.dirs || r.file))
      r.root = '/'
  }

  set query (value) {
    if (value == null)
      return delete this[$].query
    value = String (value)
    this[$].query = value
  }

  set fragment (value) {
    if (value == null)
      return delete this[$].hash
    value = String (value)
    this[$].hash = value // NB core uses 'hash' to mean 'fragment'
  }

  // Setters `protocol`, `search` and `hash` are present
  // for compat with the legacy URL API.
  /*
  set protocol (value) {
    // NB this uses the scheme setter to trigger the additional
    // checks on URLs that have a drive-letter
    if (value == null)
      this.scheme = null
    value = String (value)
    if (value[value.length-1] === ':')
      value = value.substr (0, value.length-1)
    this.scheme = value
  }

  set search (value) {
    if (value == null)
      return delete this[$].query
    value = String (value)
    if (value[0] === '?') value = value.substr (1)
    this[$].query = value    
  }
  
  set hash (value) {
    if (value == null)
      return delete this[$].hash
    value = String (value)
    if (value[0] === '#') value = value.substr (1)
    this[$].hash = value    
  }
  */

}


// Exports
// -------

const version = '0.8.0'
export { URLReference, version }