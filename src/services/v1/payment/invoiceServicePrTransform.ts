import { getPlatformIcon } from '../../../utils/platformIcons';

export function transformDataPr(data: any) {
    const checkoutDetails = {
        projectName: data.user?.fullname || 'Unknown User',
        projectURL: `https://example.com/projects/${data.id}`,
        firstName: data.user?.fullname.split(' ')[0] || 'Unknown',
        lastName: data.user?.fullname.split(' ')[1] || '',
        email: data.user?.email || 'Unknown Email',
        link: data.user ? `https://example.com/users/${data.user.id}` : '',
    };

    const user = data.user || {};

    // Transform DR items similar to influencer items
    const drPRs = (data.drCartItems || []).map((item: any) => {
        // Ensure quantity is properly converted from cart item (default to 1 if not set)
        const quantity = item.quantity != null ? Number(item.quantity) : 1;
        
        return {
            name: item.dr?.website || 'Unknown Website',
            category_name: `DR ${item.dr?.dr || 'N/A'}`,
            domainRating: item.dr?.dr || 'N/A', // Add Domain Rating field
            location: 'N/A',
            subscribers: 0,
            platform: 'DR Service',
            contentType: item.dr?.deliverables || 'DR Service',
            price: item.price ? item.price : item.dr?.price,
            quantity: quantity, // Use quantity from cart item
            socialMediaLink: item.dr?.website || '',
            notes: item.note || '', // Ensure notes is always at least an empty string
            profOfWork: item.profOfWork || '', // Ensure profOfWork is always at least an empty string
        };
    });
    // console.log(drPRs,"drPRs");

    // Check if any DR item has notes
    const hasAnyNotes = drPRs.some(
        (dr: any) => dr.notes && dr.notes.trim() !== '',
    );

    // Check if any DR item has profOfWork
    const hasAnyProfOfWork = drPRs.some(
        (dr: any) => dr.profOfWork && dr.profOfWork.trim() !== '',
    );

    const packageHeaders = (data.packageCartItems || []).map((item: any) => ({
        header: item.package.header,
        cost: item.package.cost,
        packages: item.package.packageItems.map((pkgItem: any) => ({
            media: pkgItem.media,
            link: `https://example.com/packages/${item.package.id}`,
            format: pkgItem.format,
            monthlyTraffic: pkgItem.monthlyTraffic,
            turnaroundTime: pkgItem.turnAroundTime,
        })),
    }));

    // Calculate subtotal with quantity
    const drSubtotal = (data.drCartItems || [])
        .reduce(
            (acc: number, item: any) => {
                const quantity = item.quantity != null ? Number(item.quantity) : 1;
                const price = parseFloat(item.price ? item.price : item.dr?.price || 0);
                return acc + (price * quantity);
            },
            0,
        )
        .toFixed(2);
    const packageSubtotal = (data.packageCartItems || [])
        .reduce(
            (acc: number, item: any) =>
                acc + parseFloat(item.package.cost || 0),
            0,
        )
        .toFixed(2);
    const totalPrice = (parseFloat(drSubtotal) + parseFloat(packageSubtotal)).toFixed(2);

    // Apply discount if provided (discount is a percentage)
    const discount = data.discount ?? 0;
    const discountAmount = discount > 0 ? (parseFloat(totalPrice) * discount) / 100 : 0;
    const totalPriceAfterDiscount = (parseFloat(totalPrice) - discountAmount).toFixed(2);

    // calc management fee based on total amount after discount
    const managementFee = (parseFloat(totalPriceAfterDiscount) * (data.managementFeePercentage / 100)).toFixed(
        2,
    );

    const airDropFeePercentage = 5; // 5% airdrop fee

    // Calculate the airdrop fee amount
    const airDropFee = (parseFloat(totalPriceAfterDiscount) * airDropFeePercentage) / 100;

    // Add the airdrop fee to the total price, then add the management fee
    const totalPriceWithFee = (
        parseFloat(totalPriceAfterDiscount) +
        // airDropFee +
        parseFloat(managementFee)
    ).toFixed(2);

    return {
        user,
        checkoutDetails,
        influencerPRs: drPRs, // Using same key name for template compatibility
        packageHeaders,
        influencerSubtotal: drSubtotal, // Using same key name for template compatibility
        packageSubtotal,
        totalPrice,
        discount: discount,
        discountAmount: discountAmount.toFixed(2),
        totalPriceAfterDiscount,
        managementFee,
        managementFeePercentage: data.managementFeePercentage,
        totalPriceWithFee,
        showInfluencersList: drPRs.length > 0,
        showPackagesList: packageHeaders.length > 0,
        airDropFeePercentage: airDropFeePercentage,
        influencerLength: drPRs.length,
        airDropFee,
        hasAnyNotes,
        hasAnyProfOfWork,
        getPlatformIcon, // Pass the function to template
    };
}

