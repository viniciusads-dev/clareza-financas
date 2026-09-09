"use client";
import { type CSSProperties } from "react";
import { ListChecks, Plus, Tag as TagIcon, Tags, Trash2 } from "lucide-react";

import { categories } from "@/shared/finance";

import { categoryType, categoryColorFor } from "@/frontend/finance/presentation";
import type { PageProps } from "@/frontend/finance/types";
import Empty from "@/frontend/components/finance/Empty";
import CategoryIcon from "@/frontend/components/finance/CategoryIcon";

export default function CategoriesPage({ state, openEditor, askDelete }: Pick<PageProps, "state" | "openEditor" | "askDelete">) {

  const categoryColor = (name: string) => categoryColorFor(state, name);

  return (
    <>
      <section className="panel taxonomy-header">
        <div>
          <h2>Deixe seu controle com a sua linguagem</h2>
          <p>
            Crie categorias, subcategorias e tags para encontrar
            padrões que fazem sentido para você.
          </p>
        </div>
        <div className="row-actions">
          <button
            className="secondary-button"
            onClick={() => openEditor("tags")}
          >
            <TagIcon size={16} /> Nova tag
          </button>
          <button
            className="primary-button"
            onClick={() => openEditor("categories")}
          >
            <Plus size={16} /> Nova categoria
          </button>
        </div>
      </section>
      <div className="taxonomy-grid">
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Categorias padrão</h2>
              <p>Prontas para começar, sem configuração.</p>
            </div>
            <ListChecks size={18} />
          </div>
          <div className="taxonomy-list">
            {categories.map((category) => (
              <div className="taxonomy-row" key={category}>
                <CategoryIcon
                  category={category}
                  color={categoryColor(category)}
                />
                <span>{category}</span>
                <small>
                  {categoryType(category) === "income"
                    ? "Entrada"
                    : "Saída"}
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Suas categorias</h2>
              <p>
                Subcategorias ficam agrupadas pela categoria pai.
              </p>
            </div>
            <Tags size={18} />
          </div>
          {state.categories.length ? (
            <div className="taxonomy-list">
              {state.categories.map((category) => (
                <div className="taxonomy-row" key={category.id}>
                  <CategoryIcon
                    category={category.name}
                    color={category.color}
                  />
                  <span>
                    {category.parentId
                      ? `↳ ${category.name}`
                      : category.name}
                  </span>
                  <small>
                    {category.type === "income"
                      ? "Entrada"
                      : "Saída"}
                    <button
                      className="icon-button"
                      aria-label={`Excluir ${category.name}`}
                      onClick={() =>
                        askDelete(
                          "categories",
                          category.id,
                          category.name,
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Personalize quando quiser."
              text="Crie uma categoria como “Pets”, “Cursos” ou “Renda extra” para organizar melhor seus registros."
              action={
                <button
                  className="text-button"
                  onClick={() => openEditor("categories")}
                >
                  Criar categoria <Plus size={15} />
                </button>
              }
            />
          )}
        </section>
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Tags</h2>
              <p>Uma camada extra para cruzar seus lançamentos.</p>
            </div>
            <TagIcon size={18} />
          </div>
          {state.tags.length ? (
            <div className="tag-list">
              {state.tags.map((tag) => (
                <span
                  className="tag-chip"
                  style={
                    { "--tag-color": tag.color } as CSSProperties
                  }
                  key={tag.id}
                >
                  {tag.name}
                  <button
                    aria-label={`Excluir tag ${tag.name}`}
                    onClick={() =>
                      askDelete("tags", tag.id, tag.name)
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <Empty
              title="Nenhuma tag criada."
              text="Use tags para separar projetos, pessoas ou tipos de compra."
              action={
                <button
                  className="text-button"
                  onClick={() => openEditor("tags")}
                >
                  Criar tag <Plus size={15} />
                </button>
              }
            />
          )}
        </section>
      </div>
    </>
  );
}
