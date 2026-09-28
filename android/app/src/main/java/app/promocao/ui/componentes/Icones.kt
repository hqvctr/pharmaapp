package app.promocao.ui.componentes

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Brush
import androidx.compose.material.icons.rounded.ChildCare
import androidx.compose.material.icons.rounded.CleaningServices
import androidx.compose.material.icons.rounded.Egg
import androidx.compose.material.icons.rounded.Medication
import androidx.compose.material.icons.rounded.Sanitizer
import androidx.compose.material.icons.rounded.ShoppingBasket
import androidx.compose.material.icons.rounded.Spa
import androidx.compose.ui.graphics.vector.ImageVector
import app.promocao.R
import app.promocao.modelo.Categoria

// Mapa de ícones: ux/design-tokens/tokens.json › icone.mapa.categoria.

val Categoria.icone: ImageVector
    get() = when (this) {
        Categoria.MERCEARIA -> Icons.Rounded.ShoppingBasket
        Categoria.PERECIVEIS -> Icons.Rounded.Egg
        Categoria.HIGIENE_INTIMA -> Icons.Rounded.Sanitizer
        Categoria.MAQUIAGEM -> Icons.Rounded.Brush
        Categoria.HIGIENE_BEBE -> Icons.Rounded.ChildCare
        Categoria.LIMPEZA -> Icons.Rounded.CleaningServices
        Categoria.CUIDADOS_PESSOAIS -> Icons.Rounded.Spa
        Categoria.MEDICAMENTOS_ISENTOS -> Icons.Rounded.Medication
    }

@get:StringRes
val Categoria.rotulo: Int
    get() = when (this) {
        Categoria.MERCEARIA -> R.string.cat_mercearia
        Categoria.PERECIVEIS -> R.string.cat_pereciveis
        Categoria.HIGIENE_INTIMA -> R.string.cat_higiene_intima
        Categoria.MAQUIAGEM -> R.string.cat_maquiagem
        Categoria.HIGIENE_BEBE -> R.string.cat_higiene_bebe
        Categoria.LIMPEZA -> R.string.cat_limpeza
        Categoria.CUIDADOS_PESSOAIS -> R.string.cat_cuidados_pessoais
        Categoria.MEDICAMENTOS_ISENTOS -> R.string.cat_medicamentos_isentos
    }

@get:StringRes
val Categoria.exemplo: Int
    get() = when (this) {
        Categoria.MERCEARIA -> R.string.cat_mercearia_ex
        Categoria.PERECIVEIS -> R.string.cat_pereciveis_ex
        Categoria.HIGIENE_INTIMA -> R.string.cat_higiene_intima_ex
        Categoria.MAQUIAGEM -> R.string.cat_maquiagem_ex
        Categoria.HIGIENE_BEBE -> R.string.cat_higiene_bebe_ex
        Categoria.LIMPEZA -> R.string.cat_limpeza_ex
        Categoria.CUIDADOS_PESSOAIS -> R.string.cat_cuidados_pessoais_ex
        Categoria.MEDICAMENTOS_ISENTOS -> R.string.cat_medicamentos_isentos_ex
    }
