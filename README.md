# backend-utils

## catchAppErrors

This script should be used at the end of yous main app file (usually index.js). Catches any app crashes and doesn't let the server crash.

## optionallyAddAttrs

It's util that will usually be used within "update" mutations to optionally update attrs of the model, based on if the mutation has new values for them

## pagination

It's a util that adds limit and offset to a query. WE SHOULD ADD AN EXAMPLE CODE HERE

## logSetup

That's a middleware that should be used after the user authentication and will create a req.getInfo method that should be used as the first command in every GraphQL resolver.
