// TODO: remove two constants etc. below when working in real world (along with commented out
//       read from hub at bottom of gaiaIO.js)
//
// relay.id's graphite hub for initital testing / dev work (weird netlify link--don't delete until
// condition described above working)
const RELAY_GRAPHITE_HUB = 'https://gaia.blockstack.org/hub/1PeNcCQXdg7t8iNmK7XqGVt8UyEDo4d3mF/'
const SIMULATE_DATA = true
// publicShare is what we're currently using for demos. This will change when we
// start encrypting.
const RELAY_DOC_BASES = {
  publicShare: 'https://app.graphitedocs.com/shared/docs/relay.id-',  // append <doc id>
  privateShare: `${RELAY_GRAPHITE_HUB}`, // append <doc id>sharedwith.json
  originalDoc : `${RELAY_GRAPHITE_HUB}/documents/`, // append <doc id>.json
}


const GRAPHITE_URL = 'https://app.graphitedocs.com'

class Graphite {
  constructor(ioClassInst, localUserId) {
    this.io = ioClassInst
    this.userId = localUserId
    this.indexData = undefined
  }

  getIndexData() {
    return this.indexData
  }

  // Throws!
  async readIndexData() {
    if (SIMULATE_DATA) {
      this.indexData = Graphite._getSimulatedIntermediateGraphiteData()
    } else {
      try {
        const graphiteIndex = await this._readIndexFile()
        this.indexData = this._getDataFromGraphiteIndex(graphiteIndex)
      } catch (error) {
        throw(`ERROR(graphite.js::refreshIndexData): unable to refresh index data from index file.\n${error}`)
      }
    }

    return this.indexData
  }


  static _getSimulatedIntermediateGraphiteData() {
    return {
      'relay.id-1532144113901' : {
        title : 'Test Stealthy Integration 2',
        description : '',
        author : 'relay.id',
        decryptable : {
          user : 'TBD',
          key : 'Graphite',
        },
        fileUrl : 'https://app.graphitedocs.com/shared/docs/relay.id-1532144113901',
        version : '',
        appMetadata : {
          title : 'Test Stealthy Integration 2',
          id : '1532144113901',
          updated : '7/21/2018',
          words : '11',
          sharedWith : '',
          singleDocIsPublic : 'true',
          author : 'relay.id',
          tags : '',
          fileType : 'documents',
        },
      },
      'relay.id-1532196940159' : {
        title : 'Delete Facebook Movement Spreads Worldwide',
        description : '',
        author : 'relay.id',
        decryptable : {
          user : 'TBD',
          key : 'Graphite',
        },
        fileUrl : 'https://app.graphitedocs.com/shared/docs/relay.id-1532196940159',
        version : '',
        appMetadata : {
          title : 'Delete Facebook Movement Spreads Worldwide',
          id : '1532196940159',
          updated : '7/21/2018',
          words : '23',
          sharedWith : '',
          singleDocIsPublic : 'true',
          author : 'relay.id',
          tags : '',
          fileType : 'documents',
        },
      },
      'relay.id-1532197099770' : {
        title : 'Data Breaches on the Rise Worldwide',
        description : '',
        author : 'relay.id',
        decryptable : {
          user : 'TBD',
          key : 'Graphite',
        },
        fileUrl : 'https://app.graphitedocs.com/shared/docs/relay.id-1532197099770',
        version : '',
        appMetadata : {
          title : 'Data Breaches on the Rise Worldwide',
          id : '1532197099770',
          updated : '7/21/2018',
          words : '35',
          sharedWith : '',
          author : 'relay.id',
          tags : '',
          fileType : 'documents',
        },
      },
    }
  }

  _getDataFromGraphiteIndex(aGraphiteIndex) {
    const indexData = {}

    if (aGraphiteIndex) {
      for (const element of aGraphiteIndex) {
        if (element &&
            element.author &&
            element.id &&
            element.fileType &&
            element.title ) {

          const fileName = `relay.id-${element.id}`
          const fileData = {
            title : `${element.title}`,
            description : '',
            author : `${element.author}`,
            decryptable : {
              user : 'TBD',
              key : 'Graphite'
            },
            fileUrl : `${RELAY_DOC_BASES.publicShare}${element.id}`,
            version: '',
            appMetadata: element
          }

          indexData[fileName] = fileData
        }
      }
    }

    return indexData
  }

  async _readIndexFile(indexFileName = 'stealthyIndex.json') {
    const method = 'graphite.js::_readIndexFile'

    let cipherTextObjStr = undefined
    try {
      cipherTextObjStr = await this.io.readPartnerAppFile(
        this.userId, indexFileName, GRAPHITE_URL)
    } catch(error) {
      throw `ERROR(${method}): read failure.\n${error}`
    }

    // No file present, return undefined
    if (!cipherTextObjStr) {
      return undefined
    }

    let recovered = undefined
    try {
      recovered = await utils.decryptObj(this.privateKey, cipherTextObjStr, true)
    } catch(error) {
      throw `ERROR(${method}): failed to decrypt ${indexFileName}.\n${error}`
    }

    return recovered
  }


  _dumpIndexData(theIndexData) {
    console.log('const indexData = {')
    for (const fileName in theIndexData) {
      if (!fileName || !theIndexData[fileName]) {
        continue
      }
      const fileData = theIndexData[fileName]
      console.log(`  '${fileName}' : {`)
      console.log(`    title : '${fileData.title}',`)
      console.log(`    description : '${fileData.description}',`)
      console.log(`    author : '${fileData.author}',`)
      console.log(`    decryptable : {`)
      console.log(`      user : '${fileData.decryptable.user}',`)
      console.log(`      key : '${fileData.decryptable.key}',`)
      console.log('    },')
      console.log(`    fileUrl : '${fileData.fileUrl}',`)
      console.log(`    version : '${fileData.version}',`)
      console.log('    appMetadata : {')
      for (const key in fileData.appMetadata) {
        console.log(`      ${key} : '${fileData.appMetadata[key]}',`)
      }
      console.log('    },')
      console.log('  },')
    }
    console.log('}')
  }
}

module.exports = { Graphite };
