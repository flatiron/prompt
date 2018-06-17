const prompt = require('prompt')

prompt.start()

userInput = property =>
  new Promise(resolve => {
    prompt.get(property, (err, result) => {
      if (err) {
        reject(err)
      }
      resolve(result)
    })
  })

const main = async () => {
  try {
    console.log('Starting...')

    const result1 = await userInput({
      name: 'confirmThing1',
      message: 'Does this look good to continue?',
      validator: /yes/,
      warning: 'Must respond yes to continue',
      default: '',
    })

    console.log('result1', result1)

    const result2 = await userInput({
      name: 'confirmThing2',
      message: 'Does this look good to continue?',
      validator: /yes/,
      warning: 'Must respond yes to continue',
      default: '',
    })

    console.log('result2', result2)

    console.log('Wrapping up...')
  } catch (error) {
    console.error(error)
  }
}

main()
