package com.cerisear

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.cerisear.databinding.ItemModelBinding

/** Horizontal catalog of selectable [ArModel] cards (filtered by category). */
class ModelAdapter(
    initial: List<ArModel>,
    private val onSelected: (ArModel) -> Unit
) : RecyclerView.Adapter<ModelAdapter.ModelViewHolder>() {

    private val items = initial.toMutableList()
    private var selectedId: String? = null

    fun submit(newItems: List<ArModel>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }

    fun select(id: String) {
        if (id == selectedId) return
        val previous = items.indexOfFirst { it.id == selectedId }
        val next = items.indexOfFirst { it.id == id }
        selectedId = id
        if (previous != -1) notifyItemChanged(previous)
        if (next != -1) notifyItemChanged(next)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ModelViewHolder {
        val binding = ItemModelBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ModelViewHolder(binding)
    }

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: ModelViewHolder, position: Int) {
        holder.bind(items[position])
    }

    inner class ModelViewHolder(
        private val binding: ItemModelBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(model: ArModel) {
            val context = binding.root.context
            val accent = ContextCompat.getColor(context, model.accentColorRes)

            binding.modelTitle.text = model.title
            binding.modelSubtitle.text = model.subtitle
            binding.modelIcon.setImageResource(model.iconRes)
            binding.modelIcon.imageTintList = null
            binding.iconBackdrop.setCardBackgroundColor(accent)
            binding.animatedBadge.visibility = if (model.animated) View.VISIBLE else View.GONE

            val isSelected = model.id == selectedId
            binding.card.strokeWidth = if (isSelected) dp(2.5f) else 0
            binding.card.strokeColor = accent
            binding.card.isChecked = isSelected
            binding.selectedDot.visibility = if (isSelected) View.VISIBLE else View.INVISIBLE
            binding.card.cardElevation = if (isSelected) dp(10f).toFloat() else dp(2f).toFloat()
            binding.card.animate()
                .scaleX(if (isSelected) 1f else 0.96f)
                .scaleY(if (isSelected) 1f else 0.96f)
                .setDuration(180).start()

            binding.root.setOnClickListener {
                select(model.id)
                onSelected(model)
            }
        }

        private fun dp(value: Float): Int =
            (value * binding.root.resources.displayMetrics.density).toInt()
    }
}
