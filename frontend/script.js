const categoriesContainer = document.getElementById("categories");
let cartId = localStorage.getItem("cartId");
const productsContainer = document.getElementById("products");
const searchInput = document.getElementById("search-input");
const showMoreButton = document.getElementById("show-more");

let searchTimer;
let selectedCategory = "";
let currentPage = 1;
let totalPages = 1;
let currentLimit = window.matchMedia("(max-width: 600px)").matches ? 4 : 12;
let loadingProducts = false;

const newsletterForm = document.getElementById("newsletter-form");
const newsletterEmail = document.getElementById("newsletter-email");
const newsletterMessage = document.getElementById("newsletter-message");

function showSkeletons() {
    productsContainer.innerHTML = "";
    for (let i = 0; i < Math.min(currentLimit, 8); i++) {
        const card = document.createElement("div");
        card.classList.add("product-card", "skeleton");
        const image = document.createElement("div");
        image.classList.add("product-image");
        const name = document.createElement("div");
        name.classList.add("skeleton-name");
        const price = document.createElement("div");
        price.classList.add("skeleton-price");
        card.append(image, name, price);
        productsContainer.append(card);
    }
}

function updateShowMore() {
    const remaining = Math.max(0, totalPages - currentPage) * currentLimit;
    showMoreButton.hidden = remaining === 0;
    showMoreButton.textContent = `SHOW MORE (${remaining})`;
}

function createProductCard(product) {
    const productCard = document.createElement("div");
    productCard.classList.add("product-card");

    const imageContainer = document.createElement("div");
    imageContainer.classList.add("product-image");
    const productImage = document.createElement("img");
    productImage.src = product.image;
    productImage.alt = product.name;
    imageContainer.append(productImage);

    if (!product.inStock) {
        const stockLabel = document.createElement("span");
        stockLabel.classList.add("stock-label");
        stockLabel.textContent = "НЕТ В НАЛИЧИИ";
        imageContainer.append(stockLabel);
        imageContainer.classList.add("out-of-stock");
    }
    if (product.isNew) {
        const newLabel = document.createElement("span");
        newLabel.classList.add("new-label");
        newLabel.textContent = "NEW";
        imageContainer.append(newLabel);
    }
    productCard.append(imageContainer);

    const productInfo = document.createElement("div");
    productInfo.classList.add("product-info");
    const productDetails = document.createElement("div");
    productDetails.classList.add("product-details");
    const productName = document.createElement("h3");
    productName.classList.add("product-name");
    productName.textContent = product.name;
    productDetails.append(productName);

    const priceContainer = document.createElement("div");
    priceContainer.classList.add("product-prices");
    const productPrice = document.createElement("p");
    productPrice.textContent = `${new Intl.NumberFormat("ru-RU").format(product.price)} ₽`;
    priceContainer.append(productPrice);
    if (product.oldPrice) {
        const oldPrice = document.createElement("p");
        oldPrice.classList.add("old-price");
        oldPrice.textContent = `${new Intl.NumberFormat("ru-RU").format(product.oldPrice)} ₽`;
        priceContainer.append(oldPrice);
    }
    productDetails.append(priceContainer);
    productInfo.append(productDetails);

    const productButton = document.createElement("img");
    productButton.classList.add("product-button");
    if (!product.inStock) {
        productButton.classList.add("disabled");
    }
    productButton.src = "img/arrow.png";
    productButton.alt = "Open product";
    productInfo.append(productButton);
    productCard.append(productInfo);
    return productCard;
}

function showProducts(products, append = false) {
    if (!append) productsContainer.innerHTML = "";
    if (!products.length && !append) {
        const message = document.createElement("p");
        message.classList.add("empty-message");
        message.textContent = "Ничего не найдено";
        productsContainer.append(message);
        return;
    }
    products.forEach(product => productsContainer.append(createProductCard(product)));
}

async function loadProducts({ reset = true } = {}) {
    if (loadingProducts) return;
    loadingProducts = true;
    if (reset) {
        currentPage = 1;
        showSkeletons();
    } else {
        showMoreButton.disabled = true;
        showMoreButton.textContent = "LOADING...";
    }

    const params = new URLSearchParams({ page: String(reset ? 1 : currentPage + 1), limit: String(currentLimit) });
    if (selectedCategory) params.set("category", selectedCategory);
    if (searchInput.value.trim()) params.set("search", searchInput.value.trim());

    try {
        const response = await fetch(`http://localhost:3000/api/products?${params}`);
        if (!response.ok) throw new Error("Ошибка сервера");
        const data = await response.json();
        currentPage = data.page;
        totalPages = data.pages;
        document.getElementById("products-count").textContent = data.total;
        showProducts(data.items, !reset);
        updateShowMore();
    } catch {
        productsContainer.innerHTML = "";
        const message = document.createElement("p");
        message.classList.add("empty-message");
        message.textContent = "Сервер недоступен. Попробуйте позже";
        productsContainer.append(message);
        showMoreButton.hidden = true;
    } finally {
        loadingProducts = false;
        showMoreButton.disabled = false;
        updateShowMore();
    }
}

/* Корзина */
if (cartId) {
    fetch(`http://localhost:3000/api/cart/${cartId}`)
        .then(response => {
            if (response.status === 404) {
                localStorage.removeItem("cartId");
                location.reload();
                return;
            }
            return response.json();
        })
        .then(data => {
            if (data) document.getElementById("cart-count").textContent = data.totalQuantity;
        });
} else {
    fetch("http://localhost:3000/api/cart", { method: "POST" })
        .then(response => response.json())
        .then(data => {
            cartId = data.id;
            localStorage.setItem("cartId", cartId);
            document.getElementById("cart-count").textContent = data.totalQuantity;
        });
}

/* Категории: All показывает весь каталог */
fetch("http://localhost:3000/api/categories")
    .then(response => {
        if (!response.ok) throw new Error("Ошибка сервера");
        return response.json();
    })
    .then(data => {
        document.getElementById("products-count").textContent = data.total;

        const allButton = document.createElement("button");
        allButton.type = "button";
        allButton.classList.add("active");
        allButton.textContent = `All (${data.total})`;
        allButton.addEventListener("click", () => selectCategory("", allButton));
        categoriesContainer.append(allButton);

        data.items.forEach(category => {
            const categoryButton = document.createElement("button");
            categoryButton.type = "button";
            categoryButton.textContent = `${category.name} (${category.productsCount})`;
            categoryButton.addEventListener("click", () => selectCategory(category.slug, categoryButton));
            categoriesContainer.append(categoryButton);
        });
    });

function selectCategory(slug, button) {
    selectedCategory = slug;
    categoriesContainer.querySelectorAll("button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    loadProducts();
}

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadProducts(), 300);
});

showMoreButton.addEventListener("click", () => loadProducts({ reset: false }));

showSkeletons();
loadProducts();

/* емаил уведомление  */

newsletterForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = newsletterEmail.value;
    newsletterMessage.textContent = "";

    const submitButton = newsletterForm.querySelector("button");

    submitButton.disabled = true;
    newsletterMessage.textContent = "Отправка...";

    fetch("http://localhost:3000/api/newsletter", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email
        })
    })
        .then(response => {
            if (response.status === 201) {
                newsletterMessage.textContent = "Спасибо за подписку!";              
            } else if (response.status === 409) {
                newsletterMessage.textContent = "Этот email уже подписан.";
            } else if (response.status === 422) {
                newsletterMessage.textContent = "Проверьте правильность email.";
            } else {
                newsletterMessage.textContent = "Произошла ошибка. Попробуйте позже.";
            }
        })
        .catch(() => {
            newsletterMessage.textContent = "Сервер недоступен. Попробуйте позже.";
        })
        .finally(() => {
            submitButton.disabled = false;
            newsletterForm.reset();
            newsletterEmail.addEventListener("input", () => {
                newsletterMessage.textContent = "";
            });
        });
});
