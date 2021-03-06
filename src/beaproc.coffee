bealoader = require './bealoader'
fs = require 'fs'
debugIt = require('./debugit').debugIt
util = require 'util'

console.log "Bea C++ to V8 Converter 0.1" 
if process.argv.length < 3
	console.log 'Usage: bea filename.bea [-m|-mt] [-o output_dir] [-f]'
	console.log 'Where:'
	console.log '-m  = convert @manual functions only'
	console.log '-mt = convert @manual types only'
	console.log '-o  = output directory'
	console.log '-f  = force file overwrite (valid with -m or -mt)'
	process.exit -1

args = require('./lib/argsparser').parse()

if args["node"].length < 2  
	console.log "Error: bea file not specified. Nothing to do."
	process.exit -1

beaFile = fs.realpathSync args["node"][1]


bea = new bealoader.BeaLoader beaFile

if args["-manual"] || args["-m"] then bea.options.manual = true
if args["-mtypes"] || args["-mt"] then bea.options.mtypes = true
if args["-force"] || args["-f"] then bea.options.force = true
if args["-o"] then bea.outDir = args["-o"]
debugIt ->
	bealoader.doConvert bea, beaFile
	console.log "Exit"