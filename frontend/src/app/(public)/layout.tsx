import type { ChildrenType } from '@core/types'

import Providers from '@components/Providers'
import BlankLayout from '@layouts/BlankLayout'
import { getSystemMode } from '@core/utils/serverHelpers'

const Layout = async (props: ChildrenType) => {
  const systemMode = await getSystemMode()

  return (
    <Providers direction='ltr'>
      <BlankLayout systemMode={systemMode}>{props.children}</BlankLayout>
    </Providers>
  )
}

export default Layout
